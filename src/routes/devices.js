const { Router } = require('express');
const devices = Router();
const { DeviceModel } = require('../models/deviceModel');
const { UserModel } = require('../models/userModel');
const nodemailer = require('nodemailer');

/**
 * This file contains all the routes related to device management in the application.
 * Previous to this documentation are the models and packages installed to be able to use several of the tools offered by the application.
 * communityModel will be used to manage all of the school's users, EntryModel to register every movement, and DeviceModel to manage each device.
 * Nodemailer is used as a mail manager to send notifications to users.
 */

/**
 * X)
 * Name : Send Email
 * Method : Local Function
 * Route : None
 * Params : Array with a list of emails and a string with the message to be sent.
 * Description : This function is meant to be used each time a notification via email needs to be sent to any user. The function receives a list of emails and a message.
 */
function sendEmail(emailList, msg) {
  // Via the nodemailer package, a transporter is created.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kc@britishschool.edu.co',
      pass: `${process.env.password}`,
    },
  });

  // All the information that goes in the email is written here.
  const mailOptions = {
    from: 'kc@britishschool.edu.co',
    to: emailList,
    subject: 'Knowledge Centre Notification',
    text:
      msg + '\n\nKC Services\nKnowledge Centre\nBritish International School',
  };

  // The email is sent
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent'); // + info.response);
    }
  });
}

/**
 * X) Function date
 * Name : Get current date and time
 * METHOD : Local
 * This function lets the application set the current date and time each time that something is done. The function looks for the date and time and manages strings so that it returns the current date and time which will be then set for each process that requires it.
 */

function getDateAndTime() {
  let today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  const yyyy = today.getFullYear();
  const h = String(today.getHours());
  const m = String(today.getMinutes()).padStart(2, '0');

  // Gets current date in mm/dd/yyyy format
  today = mm + '/' + dd + '/' + yyyy;
  // Gets current time
  const time = h + ':' + m;

  return [today, time];
}

/**
 * 1)
 * Name : Rent devices
 * Method : POST
 * Route : /rent
 * Description : This route is going to manage the rent of devices. Information from the user is going to come from frontend and the device will be registered as rented with all of its implications in the corresponding collections.
 */
devices.post('/rent', async function (req, res) {
  const { user } = req.body;

  // First the user input needs to be validated to check that the object contains all necessary info.
  if (!user || !user.document || !user.device || !user.number) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check all the fields and try again.',
    });
  }
  // Then it checks if the user exists
  const userExists = await UserModel.findOne({
    document: Number(user.document),
  });
  // If the user doesn't exist, then the client is notified on its side.
  if (!userExists) {
    res.send({
      status: 'Error',
      msg: `The ${user.document} doesn't seem to appear in our database.`,
    });
    // If the user exists, then it checks if it has a device rented already. If it does, the client is notified on its side.
  } else if (userExists.hasDeviceRented) {
    res.send({
      status: 'Error',
      msg: `The user ${userExists.name} ${userExists.lastName} with document ${userExists.document} currently has a device rented.`,
    });
  } else {
    // After that, the requested device is searched in the database collection.
    const requestedDevice = await DeviceModel.findOne({
      deviceType: user.device,
      deviceNumber: Number(user.number),
    });
    // If the device is not available, then the client is notified in its side.
    if (
      requestedDevice.available === null ||
      requestedDevice.available === undefined ||
      !requestedDevice.available
    ) {
      res.send({
        status: 'Error',
        msg: `The ${user.device} ${user.number} doesn't seem to be available for rent in this moment.`,
      });
    } else {
      // If instead, it is available, then the device is updated in the devices collection
      await DeviceModel.updateOne(
        {
          deviceType: user.device,
          deviceNumber: Number(user.number),
        },
        {
          $set: {
            dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            dateReturned: null,
            available: false,
            conditions: user.conditions,
            userDocument: user.document,
          },
          $push: {
            rentalHistory: {
              userDocument: user.document,
              dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
              dateReturned: null,
              conditions: user.conditions,
            },
          },
        }
      );

      // The user who is going to rent the device is also updated in the users collection.
      await UserModel.updateOne(
        { document: user.document },
        {
          $set: { hasDeviceRented: true },
          $push: {
            deviceHistory: {
              device: user.device + ' ' + user.number,
              dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
              dateReturned: null,
              conditions: user.conditions,
            },
          },
        }
      );
      // A confirmation message is declarated which will be then sent to the user who rents the device. Also a confirmation message is sent to client side.
      const message = `Dear ${userExists.name} ${userExists.lastName},\nYou have rented the ${user.device} #${user.number} from the Knowledge Centre. Remember to return it by the end of the day.\nThank you very much for using our service.\nRegards,`;
      sendEmail(userExists.email, message);
      res.send({ status: 'OK', msg: 'Device rented successfully.' });
    }
  }
});

/**
 * 2)
 * Name : Return devices
 * Method : POST
 * Route : /return
 * Description : This route is going to work in a similar way as the previous one (rent) but instead of assigning a device to a person, it will be unassigned. That's why it doesn't need to receive too much information from front end.
 */
devices.post('/return', async function (req, res) {
  // The type of device and number are received from frontend.
  const { device, number } = req.body;

  // First the user input needs to be validated to check that the necessary info is received.
  if (!device || !number) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check that device type and number are entered correctly and try again.',
    });
  } else {
    // If inputs are ok, then the device is searched in its respective collection.
    const rentedDevice = await DeviceModel.findOne({
      deviceType: device,
      deviceNumber: Number(number),
    });
    // If the device is not found in the collection, then a message is sent explaining that there are no active records with the requested data.
    if (!rentedDevice) {
      res.send({
        status: 'Error',
        msg: `The ${device} #${number} was not found in our database.`,
      });
    } else if (rentedDevice.available) {
      // If the device is available, then it means that it was not registered as rented in first place so a message is sent to client.
      res.send({
        status: 'Error',
        msg: `The ${device} #${number} does not seem to register as rented in the database.`,
      });
    } else {
      // If, instead, all conditions are met and validations are ok, we proceed to return the device. To do this, the user that has the device rented is stored in a variable to be used later.
      const userThatRented = await UserModel.findOne({
        document: rentedDevice.userDocument,
      });
      // Its existence needs to be validated first. If it does not exist then a message is sent to client.
      if (!userThatRented) {
        res.send({
          status: 'Error',
          msg: `The user was not found in our database.`,
        });
      } else {
        // After validating everything we update the user in the users collection. (It sets the hasDeviceRented to false and pushes the necessary information into the deviceHistory array.)
        await UserModel.updateOne(
          { document: rentedDevice.userDocument },
          {
            $set: { hasDeviceRented: false },
            $push: {
              deviceHistory: {
                device: device + ' ' + number,
                dateRented: null,
                dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
                conditions: null,
              },
            },
          }
        );
        // We also update the device to be returned in the devices collection. (It updates it to available again and pushes the necessary information in the rentalHistory array.)
        await DeviceModel.updateOne(
          { deviceType: device, deviceNumber: Number(number) },
          {
            $set: {
              available: true,
              conditions: 'none',
              userDocument: 0,
              dateRented: null,
              dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            },
            $push: {
              rentalHistory: {
                userDocument: userThatRented.document,
                dateRented: null,
                dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
                conditions: userThatRented.conditions,
              },
            },
          }
        );

        // Conditions of how the device rented was given in are stated.
        const conditions = rentedDevice.conditions;
        // The message to be sent to the user by email is stated.
        const message = `Dear user,\nYou returned the ${device} #${number} to the Knowledge Centre successfully. Thank you for using our service.`;
        // The email is sent the person who returned the device followed by the message written above. That's why the userThatRented object is taken from the collection.
        sendEmail(userThatRented.email, message);
        res.send({
          status: 'OK',
          msg: `The ${rentedDevice.deviceType} #${rentedDevice.deviceNumber} rented by ${userThatRented.name} ${userThatRented.lastName} was returned successfully. If the device was not returned with the following conditions: ${conditions}, please follow the due process.`,
        });
      }
    }
  }
});

/**
 * 3)
 * Name : Search devices
 * Method : POST
 * Route : /search
 * Description : This route will work as a active device searcher, letting the user in front end know, who has a certain device or if it is not rented.
 */
devices.post('/search', async function (req, res) {
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
 * Name : Get usage history
 * Method : POST
 * Route : /entries
 * Description : This route lets the user collect and retrieve information from the record history by using different filters. This will let admins know the statistics of the application usage.
 */
devices.post('/entries', async function (req, res) {
  const { searchInfo } = req.body;
  // First we check if the searchInfo object coming from frontend exists.
  if (Object.keys(searchInfo).length === 0) {
    return res.status(400).send({
      status: 'Error',
      msg: 'The fields must be ',
    });
    // If it does then we proceed to run the following code:
  } else {
    // We create some let variables to update depending on the switch case that runs next.
    let data;
    let userHistory;
    let deviceHistory;
    let dateArr;
    let fixedDate;
    // let userDates;
    // let deviceDates;
    switch (true) {
      // If the desired information is the from the user document then we search for the user in the Users collection.
      case searchInfo.document !== null:
        userHistory = await UserModel.findOne({
          document: searchInfo.document,
        });
        // We reassign the data array with the deviceHistory info so that it is sent to client.
        data = userHistory.deviceHistory;
        break;
      case searchInfo.date !== null:
        console.log(searchInfo.date);
        // Se separan los datos según el formato que trae la fecha XX-XX-XXXX
        dateArr = searchInfo.date.split('-');
        // Se revisa que la separación se haya realizado correctamente
        console.log(dateArr);
        // Se crea una nueva string con el formato utilizado para las fechas.
        fixedDate = dateArr[1] + '/' + dateArr[2] + '/' + dateArr[0];
        console.log(fixedDate);
        res.send({
          status: 'Error',
          msg: 'Date format not available in this moment.',
          data,
        });
        return;
      // deviceDates = await DeviceModel.find({
      //   rentalHistory: {
      //     $elemMatch: {
      //       $or: [
      //         { dateRented: searchInfo.date },
      //         { dateReturned: searchInfo.date },
      //       ],
      //     },
      //   },
      // });
      // userDates = await UserModel.find({
      //   deviceHistory: {
      //     $elemMatch: {
      //       $or: [
      //         { dateRented: searchInfo.date },
      //         { dateReturned: searchInfo.date },
      //       ],
      //     },
      //   },
      // });
      // console.log(deviceDates);
      // console.log(userDates);
      // break;
      // If the desired information is for a certain device, then we search for it in the devices collection.
      case searchInfo.device !== null || searchInfo.number !== 0:
        deviceHistory = await DeviceModel.findOne({
          deviceType: searchInfo.device,
          deviceNumber: searchInfo.number,
        });
        // We reassign the data array with the rentalHistory info so that it is sent to client.
        data = deviceHistory.rentalHistory;
        break;
      default:
        data = [];
        break;
    }

    // console.log(data);

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
devices.get('/rented', async function (req, res) {
  // The list of rented devices and of actives users are assigned from their respectiv collections.
  const rentedDevices = await DeviceModel.find({ available: false });
  const activeOnes = await UserModel.find({ hasDeviceRented: true });
  // If there are no active users, then an empty array is sent to front side
  if (!activeOnes) {
    const listOfRentedDevices = [];
    res.status(500).send({
      status: 'OK',
      msg: 'There are no rented devices to be fetched.',
      listOfRentedDevices,
    });
    // If there are active devices the
  } else {
    const listOfRentedDevices = await activeOnes.map((user) => {
      const deviceExists = rentedDevices.find(
        (device) => device.userDocument === user.document
      );
      if (deviceExists) {
        // console.log(deviceExists.dateRented);
        const activeUser = {
          ...user._doc, // copy all properties of the user object
          device: deviceExists.deviceType,
          number: deviceExists.deviceNumber,
          conditions: deviceExists.conditions,
          // We take the last element of the rentalhistory array and grab the dateRented by converting it to isoString and taking only the date.
          date: deviceExists.dateRented,
          // .toISOString()
          // .substring(0, 10)
          // .split('-')
          // .reverse()
          // .join('/'),
          // time: deviceExists.dateRented.toISOString().substring(11, 19),
          // time: deviceExists.dateRented,
        };
        return activeUser;
      }
      return user;
    });
    // console.log(listOfRentedDevices);
    res.send({ status: 'ok', msg: 'Info found', listOfRentedDevices });
  }
});

/**
 * 6)
 * Name : Send notifications to one user
 * Method : POST
 * Route : /notification
 * Description : The purpose of this route is to send an email notification to a specific person, that the user decides via frontend.
 */
devices.post('/notification', function (req, res) {
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
devices.post('/notification_all', function (req, res) {
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
devices.get('/rented_all_time', async function (req, res) {
  // An object is initialized.
  // let data = {};

  // const listOfRentedEntries = await DeviceModel.find({
  //   'rentalHistory.0': { $exists: true },
  // });

  // // console.log(listOfRentedEntries.length);

  // if (listOfRentedEntries.length === 0) {
  //   res.send({
  //     status: 'Error',
  //     msg: 'Data of rented entries could not be loaded',
  //     data,
  //   });
  // } else {
  //   data = listOfRentedEntries;
  //   res.send({ status: 'OK', msg: 'Info found', data });
  // }

  let data = [];
  await DeviceModel.aggregate([
    {
      $unwind: '$rentalHistory',
    },
    {
      $group: {
        _id: '$deviceId',
        totalRentals: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: '$totalRentals' },
      },
    },
  ]).then((results) => {
    console.log('Total number of rentals:', results[0].totalCount);
    data = results[0].totalCount;
  });
  res.send({ status: 'OK', msg: 'Info found', data });
});

/**
 * 9)
 * Name : Get list of available devices
 * Method : GET
 * Route : /available
 * Description : This route lets the frontend application display how many devices have been rented so far.
 */
devices.get('/available', async function (req, res) {
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

exports.devices = devices;
