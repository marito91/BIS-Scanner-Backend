const { Router } = require('express');
const devices = Router();
const { RecordModel } = require('../models/recordModel');
const { communityModel } = require('../models/communityModel');
const { DeviceModel } = require('../models/deviceModel');
const nodemailer = require('nodemailer');

/**
 * This file contains all the routes related to device management in the application.
 * Previous to this documentation are the models and packages installed to be able to use several of the tools offered by the application.
 * communityModel will be used to manage all of the school's users, EntryModel to register every movement, and DeviceModel to manage each device.
 * Nodemailer is used as a mail manager to send notifications to users.
 */

/**
 * X) Function date
 * Name : Get current date and time
 * METHOD : Local
 * This function lets the application set the current date and time each time that something is done. The function looks for the date and time and manages strings so that it returns the current date and time which will be then set for each process that requires it.
 */

function getDateTime() {
  let today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  const yyyy = today.getFullYear();
  const h = String(today.getHours());
  const m = String(today.getMinutes()).padStart(2, '0');

  today = mm + '/' + dd + '/' + yyyy;
  // Saca hora actual
  const time = h + ':' + m;

  return [today, time];
}

/**
 * X) Function Overwrite
 * Name : Overwrite rented device
 * METHOD : Database connected
 * Params : Receives student document, device type, device number and current date
 * Description : This function updates a user by assigning the device brought from Front end and changing the active state to true. The function also updates the information in devices collection.
 */

function overwrite(user) {
  // First it looks for the entry that's going to be updated by document (code : document)
  communityModel.updateOne(
    { code: user.document },
    // Since the user is proved to exist before calling this function, it will immediately set the new information that's going to be applied.
    {
      $set: {
        device: user.device,
        number: user.number,
        active: true,
        date: getDateTime()[0],
        time: getDateTime()[1],
      },
    },
    function (error) {
      // If there is an error, then a message will be sent
      if (error) {
        console.log(
          'Renting could not be registered. Error in overwriting. Please contact support.'
        );
        // res.send({
        //   estado: 'error',
        //   msg: 'Renting could not be registered. Error in overwriting. Please contact support.',
        // });
      }
    }
  );
  // This function will also search for the device in the devices collection. Device type and number need to be the same so that changes are applied.
  DeviceModel.updateOne(
    { device: user.device, number: user.number, available: true },
    // After validating device and number, and if it is available, the entry will be updated.
    {
      $set: {
        date: getDateTime()[0],
        time: getDateTime()[1],
        available: false,
        comments: user.comments,
        user: user.document,
      },
    },
    function (error) {
      // If there is an error, a message will be sent to front end.
      if (error) {
        console.log(
          'Renting could not be registered. Error in overwriting. Please contact support.'
        );
        // res.send({
        //   estado: 'error',
        //   msg: 'Renting could not be registered. Error in overwriting. Please contact support.',
        // });
      }
    }
  );
}

/**
 * X) Function returnDevice
 * Name : Return rented device
 * METHOD : Database connected
 * Params : Receives device type, device number and current date
 * Description : This function looks for the user in the communities collection and updates the information regarding the device rented. The devices collection is also updated.
 */

function returnDevice(dev, num) {
  // First, it searches for the user that's going to be updated (device: dev, number: num)
  communityModel.updateOne(
    { device: dev, number: num },
    // After finding the active user, it sets the new information for the entry found.
    {
      $set: {
        device: 'none',
        number: 0,
        active: false,
      },
    },
    function (error) {
      // If there is an error, it sends a message to front end to contact support.
      if (error) {
        console.log('There was an error updating the communities collection.');
      }
    }
  );
  // It searches for the device to be returned in the devices collection. (It updates it to available again.)
  DeviceModel.updateOne(
    { device: dev, number: num },
    // After finding the entry, it sets the new information.
    {
      $set: {
        date: 'none',
        time: 'none',
        available: true,
        comments: 'none',
        user: 0,
      },
    },
    function (error) {
      // If there is an error, it sends a message to front end to contact support.
      if (error) {
        console.log('There was an error updating the devices collection.');
      }
    }
  );
}

/**
 * X) Function updateRecords
 * Name : Register new record
 * METHOD : Database connected
 * Params: Receives all info for later checking
 * Purpose: Registers a new entry everytime something is done in the application. Creates a history of processes.
 */
function updateRecords(existingUser, dev, num, movement, bookInfo) {
  const newRecord = new RecordModel({
    document: existingUser.code,
    firstName: existingUser.firstName,
    lastName: existingUser.lastName,
    secondLastName: existingUser.secondLastName,
    grade: existingUser.grade,
    email: existingUser.email,
    device: dev,
    number: num,
    date: getDateTime()[0],
    time: getDateTime()[1],
    book: bookInfo,
    type: movement,
  });
  newRecord.save(function (error) {
    if (error) {
      console.log(error);
      console.log('Could not register a new record.');
    } else {
      console.log('New record registered.');
    }
  });
}

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
 * 1)
 * Name : Rent devices
 * Method : POST
 * Route : /rent
 * Description : This route is going to manage the rent of devices. Information from the user is going to come from frontend and the device will be registered as rented with all of its implications in the corresponding collections.
 */
devices.post('/rent', async function (req, res) {
  // Information comes from frontend as a json object called user. This object contains the following information:
  /**
   * document
   * device
   * number
   * name
   * section
   * date
   * time
   * email
   * comments
   */
  const { user } = req.body;

  // The object's device and number keys are destructured in differente variables.
  const [device, number] = [user.device, user.number];

  // There's a search done in the communities collection to check if the user exists.
  const exists = await communityModel.findOne({
    code: parseInt(user.document),
  });

  // We also check if the device is already rented or not in the devices collection.
  const isRented = await DeviceModel.findOne({
    device: user.device,
    number: user.number,
  });

  // If the user doesn't exist in database, we send a message indicating that the user is not available to use the service since it is not part of the database.
  if (!exists) {
    res.send({
      status: 'error',
      msg: `The user ${user.document} is not registered in our Database.`,
    });
    // If the user exists, then we check if it has a device rented already.
  } else {
    // If the user has a rented device, we send a message to frontend indicating that the device the person has rented needs to be returned first. (The message contains the device and number)
    if (exists.active) {
      res.send({
        status: 'Error',
        msg: `The user ${exists.firstName} ${exists.lastName} with document ${
          exists.code
        } currently has the device ${exists.device} #${
          exists.number
        } rented since ${isRented ? isRented.date : 'NO DATE FOUND'}.`,
      });
    } else {
      // If the device requested is already rented (which should not happen as it is available physically), a message will be sent to front end requiring to choose another device.
      if (!isRented.available) {
        res.send({
          status: 'Error',
          msg: `The ${user.device} #${user.number} is currently rented. Please select an available device.`,
        });
      } else {
        // If all conditions are met and validated, we proceed to register a new record (updateRecords function), assign the device to the requested user (overwrite function) and send the email notification (sendEmail function) with the corresponding message.
        overwrite(user);
        updateRecords(exists, device, parseInt(number), 'RENT', ['none']);
        const message = `Dear user,\nYou have rented the ${device} #${number} from the Knowledge Centre. Remember to return it by the end of the day.\nThank you very much for using our service.\nRegards,`;
        sendEmail(exists.email, message);
        res.send({ estado: 'ok', msg: 'Device rented successfully.' });
      }
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
  // We destructure the body and parse the number to int.
  const [type, num] = [device, Number(number)];
  // We check on console to see if the data was sent successfully.
  console.log('Device: ' + type);
  console.log('Number: ' + num);

  // First we check, who has the device rented.
  const exists = await communityModel.findOne({
    device: type,
    number: parseInt(num),
  });

  // Then we check if the device really is rented.
  const rentedDevice = await DeviceModel.findOne({
    device: type,
    number: parseInt(num),
  });

  console.log(rentedDevice);

  // If the device is rented, we check in what conditions it was done so.
  const conditions = rentedDevice.comments;
  console.log(conditions);

  // If no one has the device rented, then a message is sent explaining that there are no active records with the requested data.
  if (!exists) {
    res.send({
      status: 'error',
      msg: `The ${type} #${num} was not found in our database.`,
    });
    // If, instead, all conditions are met and validations are ok, we proceed to return the device with the function returnDevice().
  } else {
    const message = `Dear user,\nYou returned the ${type} #${num} to the Knowledge Centre successfully. Thank you for using our service.`;
    returnDevice(type, parseInt(num));
    //  Since this is also a new record, we need to register a new entry in the records collection and send an email to the person that returned the device.
    updateRecords(exists, device, parseInt(number), 'RETURN', ['none']);
    // The email is sent the person who returned the device followed by the message written above.
    sendEmail(exists.email, message);
    res.send({
      estado: 'ok',
      msg: `The ${exists.device} #${exists.number} rented by ${exists.firstName} ${exists.lastName} was returned successfully.`,
      conditions,
    });
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
  // An object from frontend with the required search information is received
  const { searchInfo } = req.body;

  // The object's keys are destructured
  const [type, num] = [searchInfo.device, searchInfo.number];

  // With the key's values destructured, an entry is searched in the communities collection to check if it exists.
  const exists = await communityModel.findOne({
    device: type,
    number: parseInt(num),
  });

  const rentedDevice = await DeviceModel.findOne({
    device: type,
    number: parseInt(num),
  });

  // If entry doesn't exist a message is sent to frontend saying that a device was not found and that it is not rented in this moment.
  if (!rentedDevice) {
    res.send({
      status: 'error',
      msg: `The ${type} #${num} is not rented in this moment.`,
    });
    // if a record is found, then a message saying which one and who has it is sent to frontend.
  } else {
    res.send({
      estado: 'ok',
      msg: `The ${exists.device} #${exists.number} is currently rented by ${exists.firstName} ${exists.lastName} ${exists.secondLastName} from ${exists.grade} since ${rentedDevice.date} at ${rentedDevice.time} and with the following conditions: ${rentedDevice.comments}.`,
    });
  }
});

/**
 * 4a)
 * Name : Get Records by Document
 * Method : POST
 * Route : /entries
 * Description : This route lets the user collect and retrieve information from the record history by using the document filter. This will let admins know the statistics of the application usage.
 */
devices.post('/entries/document', async function (req, res) {
  // Se recibe la información del frontend
  const { searchInfo } = req.body;
  const data = await RecordModel.find({
    document: parseInt(searchInfo.document),
  });

  res.send({ status: 'ok', msg: 'Info found', data });
});

/**
 * 4b)
 * Name : Get Records by date
 * Method : POST
 * Route : /entries
 * Description : This route lets the user collect and retrieve information from the record history by using the date filter. This will let admins know the statistics of the application usage.
 */
devices.post('/entries/date', async function (req, res) {
  // Se recibe la información del frontend
  const { searchInfo } = req.body;
  const dat = searchInfo.date;
  // Se verifica como se recibe la fecha
  console.log(dat);
  // Se separan los datos según el formato que trae la fecha XX-XX-XXXX
  const dateArr = dat.split('-');
  // Se revisa que la separación se haya realizado correctamente
  console.log(dateArr);
  // Se crea una nueva string con el formato utilizado para las fechas.
  const fixedDate = dateArr[1] + '/' + dateArr[2] + '/' + dateArr[0];
  console.log(fixedDate);

  const data = await RecordModel.find({ date: fixedDate });

  res.send({ status: 'ok', msg: 'Info found', data });
});

/**
 * 5)
 * Name : Get Device Entries
 * Method : GET
 * Route : /devices
 * Description : This route is going to send the list of rented devices so that they are being able to be displayed on frontend and are easily accesible to the users.
 */
devices.get('/rented', function (req, res) {
  // The data is initialized as an object.
  let data = {};

  // A search for all the users who have a rented device is done in the communities collection.
  communityModel.find({ active: true }, function (error, activeOnes) {
    if (error) {
      res.send({
        status: 'Error',
        msg: 'No se pudo establecer una conexión a base de datos.',
      });
    } else {
      // The data is sent via the created object to frontend.
      data = activeOnes;
      res.send({ status: 'ok', msg: 'Info found', data });
    }
  });
});

/**
 * 5A)
 * Name : Check devices rented
 * Method : GET
 * Route : /rented-devices
 * Description : The client will have all of the information regarding the devices rented from the devices db
 */

devices.get('/rented-devices', function (req, res) {
  let devicesRented = {};

  // A search for all the users who have a rented device is done in the communities collection.
  DeviceModel.find({ available: false }, function (error, rentedOnes) {
    if (error) {
      res.send({
        status: 'Error',
        msg: 'No se pudo establecer una conexión a base de datos.',
      });
    } else {
      // The data is sent via the created object to frontend.
      devicesRented = rentedOnes;
      res.send({ status: 'ok', msg: 'Info found', devicesRented });
    }
  });
});

/**
 * 6)
 * Name : Send notifications to one user
 * Method : POST
 * Route : /notification
 * Description : The purpose of this route is to send an email notification to a specific person, that the user decides via frontend.
 */
devices.post('/notification', function (req, res) {
  // The recipient´s information is received via an object that comes from frontend.
  const { user } = req.body;

  // We extract the email from the object.
  const email = user.email;

  // The text that is going to be sent, is written in prior hand.
  const mailText = `Dear ${user.name},\nYou have a device from the library currently rented. Please return it to the Knowledge Centre by the end of day.\nThank you very much!`;

  // We use the sendEmail function adding the email as first param and the text as the second param. A message indicating that everything worked is sent to Frontend.
  sendEmail(email, mailText);
  res.send({
    status: 'ok',
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
    status: 'ok',
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
devices.get('/rented_all_time', function (req, res) {
  // An object is initialized.
  let data = {};

  // Inside the records
  RecordModel.find({ type: 'RENT' }, function (error, rentedEntries) {
    if (error) {
      res.send({
        status: 'Error',
        msg: 'A connection to database could not be established.',
      });
    } else {
      data = rentedEntries;
      res.send({ status: 'ok', msg: 'Info found', data });
    }
  });
});

/**
 * 9)
 * Name : Get list of available devices
 * Method : GET
 * Route : /available
 * Description : This route lets the frontend application display how many devices have been rented so far.
 */
devices.get('/available', async function (req, res) {
  // An object is initialized.
  // let ipads = {};
  // let chromebooks = {};

  // Inside the records
  const availableIpads = await DeviceModel.find({
    available: true,
    device: 'iPad',
  });
  const availableChromebooks = await DeviceModel.find({
    available: true,
    device: 'ChromeBook',
  });

  if (availableIpads.length === 0 || availableChromebooks.length === 0) {
    res.send({
      status: 'Error',
      msg: 'A connection to database could not be established.',
    });
  } else {
    res.send({
      status: 'ok',
      msg: 'Info found',
      availableChromebooks,
      availableIpads,
    });
  }
});

exports.devices = devices;
