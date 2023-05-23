const { Router } = require('express');
const newDevices = Router();
const { DeviceModel } = require('../models/devicesModel');
const { UserModel } = require('../models/userModel');

const sendEmail = require('../routes/sendMail');

/**
 * This file contains all the routes related to device management in the application.
 * Previous to this documentation are the models and packages installed to be able to use several of the tools offered by the application.
 * communityModel will be used to manage all of the school's users, EntryModel to register every movement, and DeviceModel to manage each device.
 * Nodemailer is used as a mail manager to send notifications to users.
 */

/**
 * 1)
 * Name : Rent devices
 * Method : POST
 * Route : /rent
 * Description : This route is going to manage the rent of devices. Information from the user is going to come from frontend and the device will be registered as rented with all of its implications in the corresponding collections.
 */
newDevices.post('/rent', async function (req, res) {
  const { user } = req.body;

  // First the user input needs to be validated to check that the object contains all necessary info.
  if (!user || !user.document || !user.device || !user.number) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check all the fields and try again.',
    });
    return;
  }

  try {
    // Then it checks if the user exists
    const userExists = await UserModel.findOne({
      document: Number(user.document),
    });

    if (!userExists) {
      res.send({
        status: 'Error',
        msg: `The ${user.document} doesn't seem to appear in our database.`,
      });
      return;
    }

    // Then we check if the user has a rented device
    const userHasDeviceRented = await DeviceModel.findOne({
      userDocument: Number(user.document),
    });

    if (userHasDeviceRented) {
      res.send({
        status: 'Error',
        msg: `The user ${userExists.name} ${userExists.lastName} with document ${userExists.document} currently has a device rented.`,
      });
      return;
    }

    // After that we need to check that the requested device is available. Is it is, then it will updated it.
    const requestedDevice = await DeviceModel.findOneAndUpdate(
      {
        deviceType: user.device,
        deviceNumber: user.number,
        available: true,
      },
      {
        $set: {
          dateRented: new Date(),
          available: false,
          conditions: user.conditions,
          userDocument: user.document,
        },
        $push: {
          rentalHistory: {
            userDocument: user.document,
            dateRented: new Date(),
            conditions: user.conditions,
          },
        },
      },
      { new: true } // Return the updated document
    );

    if (!requestedDevice) {
      res.send({
        status: 'Error',
        msg: `The ${user.device} ${user.number} doesn't seem to be available for rent in this moment.`,
      });
      return;
    }

    // Update user rental history
    await UserModel.findOneAndUpdate(
      { document: user.document },
      {
        $push: {
          rentalHistory: {
            deviceType: requestedDevice.deviceType,
            number: requestedDevice.deviceNumber,
            dateRented: requestedDevice.dateRented,
            dateReturned: null,
            conditions: requestedDevice.conditions,
          },
        },
      }
    );

    const message = `Dear ${userExists.name} ${userExists.lastName},\nYou have rented the ${requestedDevice.deviceType} #${requestedDevice.deviceNumber} from the Knowledge Centre. Remember to return it by the end of the day.\nThank you very much for using our service.\nRegards,`;
    sendEmail(userExists.email, message);
    res.send({ status: 'OK', msg: 'Device rented successfully.' });
  } catch (error) {
    console.log('Renting could not be registered. Error:', error);
    res.send({
      status: 'Error',
      msg: 'Renting could not be registered. Please contact support.',
    });
  }
});

/**
 * 2)
 * Name : Return devices
 * Method : POST
 * Route : /return
 * Description : This route is going to work in a similar way as the previous one (rent) but instead of assigning a device to a person, it will be unassigned. That's why it doesn't need to receive too much information from front end.
 */
newDevices.post('/return', async function (req, res) {
  // The type of device and number are received from frontend.
  const { device, number } = req.body;

  // First the user input needs to be validated to check that the necessary info is received.
  if (!device || !number) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check that device type and number are entered correctly and try again.',
    });
    return;
  }

  // First we check if the device really is rented.
  const rentedDevice = await DeviceModel.findOne({
    device,
    number: Number(number),
  });
  // If no one has the device rented, then a message is sent explaining that there are no active records with the requested data.
  if (!rentedDevice) {
    res.send({
      status: 'Error',
      msg: `The ${device} #${number} was not found in our database.`,
    });
    // If, instead, all conditions are met and validations are ok, we proceed to return the device.
  } else {
    // The user that has the device rented is stored in a variable to be used later.
    const userThatRented = await UserModel.findOne({
      document: rentedDevice.userDocument,
    });
    // It searches for the device to be returned in the devices collection. (It updates it to available again.)
    DeviceModel.updateOne(
      { device, number: Number(number) },
      // After finding the entry, it sets the new information.
      {
        $set: {
          dateRented: null,
          dateReturned: new Date(),
          available: true,
          conditions: 'none',
          user: 0,
        },
        $push: {
          rentalHistory: {
            userDocument: userThatRented.document,
            dateReturned: new Date(),
            conditions: userThatRented.conditions,
          },
        },
      },

      function (error, result) {
        // If there is an error, it sends a message to front end to contact support.
        if (error) {
          console.log('There was an error updating the devices collection.');
          res.send({
            status: 'Error',
            msg: 'There was an error updating the devices collection. Please contact ICT support.',
          });
          return;
        }
        // If there is no error, but the update operation doesn't affect any documents, it means that the requested device is not rented.
        if (result.nModified === 0) {
          res.send({
            status: 'Error',
            msg: `The ${device} #${number} is not rented.`,
          });
          return;
        }

        // Update user rental history
        UserModel.findOneAndUpdate(
          { document: userThatRented.document },
          {
            $push: {
              rentalHistory: {
                deviceType: device,
                number: Number(number),
                dateRented: null,
                dateReturned: new Date(),
                conditions: null,
              },
            },
          }
        );

        // Conditions of how the device rented was given in are stated.
        const conditions = rentedDevice.conditions;
        // The message to be sent to the user by email is stated.
        const message = `Dear user,\nYou returned the ${device} #${number} to the Knowledge Centre successfully. Thank you for using our service.`;
        // The email is sent the person who returned the device followed by the message written above.
        sendEmail(userThatRented.email, message);
        res.send({
          status: 'OK',
          msg: `The ${rentedDevice.device} #${rentedDevice.number} rented by ${userThatRented.firstName} ${userThatRented.lastName} was returned successfully.`,
          conditions,
        });
      }
    );
  }
});

/**
 * 3)
 * Name : Search devices
 * Method : POST
 * Route : /search
 * Description : This route will work as a active device searcher, letting the user in front end know, who has a certain device or if it is not rented.
 */
newDevices.post('/search', async function (req, res) {
  // Checks that the request body is not empty
  if (
    !req.body ||
    !req.body.searchInfo ||
    !req.body.searchInfo.device ||
    !req.body.searchInfo.number
  ) {
    res.status(400).send({
      status: 'Error',
      msg: 'The information is missing. Please make sure to check all fields. Device type and number should be input.',
    });
    return;
  }

  // Checks that the device and number properties are of the correct type
  if (
    typeof req.body.searchInfo.device !== 'string' ||
    typeof req.body.searchInfo.number !== 'number'
  ) {
    res.status(400).send({
      status: 'Error',
      msg: 'Invalid data type for device type or number',
    });
    return;
  }

  // An object from frontend with the required search information is received
  const { searchInfo } = req.body;

  const rentedDevice = await DeviceModel.findOne({
    device: searchInfo.device,
    number: Number(searchInfo.number),
  });

  // If entry doesn't exist a message is sent to frontend saying that a device was not found and that it is not rented in this moment.
  if (!rentedDevice) {
    res.send({
      status: 'Error',
      msg: `The ${searchInfo.device} #${searchInfo.number} is not rented in this moment.`,
    });
    // if a record is found, then a we search for the user in the users collection and send a message saying who's the user sent to frontend.
  } else {
    // With the key's values destructured, an entry is searched in the communities collection to check if it exists.
    const exists = await UserModel.findOne({
      document: rentedDevice.userDocument,
    });
    res.send({
      status: 'OK',
      msg: `The ${rentedDevice.device} #${rentedDevice.number} is currently rented by ${exists.name} ${exists.lastName} from ${exists.grade} since ${rentedDevice.dateRented} and with the following conditions: ${rentedDevice.conditions}.`,
    });
  }
});

/**
 * 4)
 * Name : Get Records
 * Method : POST
 * Route : /entries
 * Description : This route lets the user collect and retrieve information from the record history by using different filters. This will let admins know the statistics of the application usage.
 */
newDevices.post('/entries', async function (req, res) {
  const { searchInfo } = req.body;
  if (Object.keys(searchInfo).length === 0) {
    return res.status(400).send({
      status: 'Error',
      msg: 'The searchInfo field is required.',
    });
  } else {
    console.log(searchInfo);
    let data;
    switch (true) {
      case searchInfo.document !== null:
        data = await DeviceModel.find({
          rentalHistory: {
            $elemMatch: { userDocument: Number(searchInfo.document) },
          },
        });
        break;
      case searchInfo.date !== null:
        data = await DeviceModel.find({
          rentalHistory: {
            $elemMatch: {
              dateRented: searchInfo.date,
              dateReturned: searchInfo.date,
            },
          },
        });
        break;
      case searchInfo.device !== null || searchInfo.number !== 0:
        data = await DeviceModel.find({
          rentalHistory: {
            $elemMatch: {
              deviceType: searchInfo.device,
              deviceNumber: searchInfo.number,
            },
          },
        });
        break;
      default:
        data = [];
        break;
    }

    console.log(data);

    res.send({ status: 'OK', msg: 'Entries found.', data });
  }
});

/**
 * 5)
 * Name : Get Device Entries
 * Method : GET
 * Route : /devices
 * Description : This route is going to send the list of rented devices so that they are being able to be displayed on frontend and are easily accesible to the users.
 */
newDevices.get('/rented', async function (req, res) {
  try {
    let listOfRentedDevices = {};
    const rentedDevices = await DeviceModel.find({ available: false });
    const activeOnes = await UserModel.find({ hasDeviceRented: true });
    activeOnes.forEach((user) => {
      const device = rentedDevices.find(
        (device) => device.userDocument === user.document
      );
      if (device) {
        user.device = device.deviceType;
        user.number = device.number;
      }
    });
    listOfRentedDevices = activeOnes;
    res.send({ status: 'ok', msg: 'Info found', listOfRentedDevices });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 'Error',
      msg: 'There was a problem trying to fetch the rented devices.',
    });
  }
});

/**
 * 6)
 * Name : Send notifications to one user
 * Method : POST
 * Route : /notification
 * Description : The purpose of this route is to send an email notification to a specific person, that the user decides via frontend.
 */
newDevices.post('/notification', function (req, res) {
  // Validate the request body
  const { user } = req.body;
  if (!user || !user.email || !user.name) {
    return res.status(400).send({
      status: 'Error',
      msg: 'Invalid request body. Please provide a user object with email and name properties',
    });
  }

  // We extract the email from the object.
  const email = user.email;

  // The text that is going to be sent, is written in prior hand.
  const mailText = `Dear ${user.name},\nYou have a device from the library currently rented. Please return it to the Knowledge Centre by the end of day.\nThank you very much!`;

  // We use the sendEmail function adding the email as first param and the text as the second param. A message indicating that everything worked is sent to Frontend.
  sendEmail(email, mailText);
  res.send({
    status: 'OK',
    msg: 'The user was notified by email.',
  });
});

/**
 * 7)
 * Name : Send notifications to all users
 * Method : POST
 * Route : /notification
 * Description : Similar to the previous one, this route sends a notification via email, but this time to all active users, or in other hands, all users that have a device currently rented.
 */
newDevices.post('/notification_all', function (req, res) {
  // An object is received from Frontend containing all the active users information.
  const { rented } = req.body;

  // An array of emails is created with the map function.
  const emails = rented.map((user) => user.email);

  // The default message is added to the variable mailText
  const mailText =
    'Dear user,\nYou have a device from the library currently rented. Please return it to the Knowledge Centre by the end of day.\nThank you very much!';

  // The function sendEmail is used with the email list as first param and the text as second param. A message is sent to frontend notifying that everything worked.
  sendEmail(emails, mailText);
  res.send({
    status: 'OK',
    msg: 'Notifications were sent to every user.',
  });
});

/**
 * 8)
 * Name : Get device renting history
 * Method : GET
 * Route : /rented_all_time
 * Description : This route lets the frontend application display how many devices have been rented so far.
 */
newDevices.get('/rented_all_time', function (req, res) {
  // An object is initialized.
  let data = {};

  // Inside the records
  DeviceModel.find(
    { rentalHistory: { $size: 1 } },
    function (error, rentedEntries) {
      if (error) {
        res.send({
          status: 'Error',
          msg: 'A connection to database could not be established.',
        });
      } else {
        data = rentedEntries;
        res.send({ status: 'OK', msg: 'Info found', data });
      }
    }
  );
});

/**
 * 9)
 * Name : Get list of available devices
 * Method : GET
 * Route : /available
 * Description : This route lets the frontend application display how many devices have been rented so far.
 */
newDevices.get('/available', async function (req, res) {
  // Inside the records
  const availableIpads = await DeviceModel.find({
    available: true,
    deviceType: 'iPad',
  });
  const availableChromebooks = await DeviceModel.find({
    available: true,
    deviceType: 'ChromeBook',
  });

  if (availableIpads.length === 0 || availableChromebooks.length === 0) {
    res.send({
      status: 'Error',
      msg: 'Availability information for devices could not be fetched from the database. Please contact ICT Support.',
    });
  } else {
    res.send({
      status: 'OK',
      msg: 'Availability information for all devices was found succesfully.',
      availableChromebooks,
      availableIpads,
    });
  }
});

exports.newDevices = newDevices;
