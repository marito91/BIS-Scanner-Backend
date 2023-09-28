const { Router } = require('express');
const users = Router();
const { AdminModel } = require('../models/adminModel');
const { UserModel } = require('../models/userModel');
const { compare } = require('bcryptjs');
const { sign } = require('jsonwebtoken');
const nodemailer = require('nodemailer');

/**
 * This file contains all the routes related to user management in the application.
 * Previous to this documentation are the models and packages installed to be able to use several of the tools offered by the application.
 * It imports users using router express, bcryptjs compare for encrypted keys, and jsonwebtoken to send information to front via tokens.
 * Nodemailer is used as a mail manager to send notifications to users.
 */

/**
 * X)
 * Name : Send Email
 * Description : The purpose of this function is to be in charge of sending emails/notifications to users. It receives an array with an email list along with the message that will be sent to that list.
 */
function sendEmail(emailList, msg) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kc@britishschool.edu.co',
      pass: `${process.env.password}`,
    },
  });

  const mailOptions = {
    from: 'kc@britishschool.edu.co',
    to: emailList,
    subject: 'Knowledge Centre Notification',
    text:
      msg + '\n\nKC Services\nKnowledge Centre\nBritish International School',
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

/**
 * 1)
 * Name : Login users
 * Method : POST
 * Route : /login
 * Description : The purpose of this route is to log in users who try to enter the application in the front end. This route receives an object that includes email and password, checks that it is in the database and determines if the user can access or not by sending the token with the required information to the front end.
 */

users.post('/login', async function (req, res) {
  // Captures email / password
  const { localUser } = req.body;

  const username = localUser.username;
  const password = localUser.password;

  // Checks if the user exists in DB
  const exists = await AdminModel.findOne({ email: username });

  // If the user does not exist, it sends a message indicating that the user does not exist in the database. (Since it is a reduced and controlled list then few users will have access.)
  if (!exists) {
    return res.status(401).json({
      status: 'Error',
      msg: `The email ${username} does not appear in our database. Please contact support.`,
    });
  }

  // Compares password
  const passOK = await compare(password, exists.password);
  if (passOK === true) {
    const token = sign(
      {
        email: exists.email,
        first: exists.firstName,
        last: exists.lastName,
        document: exists.code,
        userType: 'admin',
      },
      process.env.JWT_SECRET_KEY
    );
    return res
      .status(200)
      .json({ status: 'ok', msg: 'You have signed in successfully.', token });
  }
  return res.status(401).json({
    status: 'Error',
    msg: 'The email and password do not match. Please contact support.',
  });
});

/**
 * 2)
 * Name : Request Password
 * Method : POST
 * Route : /request_password
 * Description : In this route, admins can request their passwords if the forgot them. The password will be sent to their emails as long as they are part of the list.
 */

// Route currently under construction.
users.post('/request_password', async function (req, res) {
  // Captures email
  const { localUser } = req.body;

  const requestedEmail = localUser.username;

  // Checks if the user exists in DB
  const exists = await AdminModel.findOne({ email: requestedEmail });

  // If the user is not part of the admins list, then an error message will be sent.
  if (!exists) {
    return res.status(401).json({
      status: 'Error',
      msg: `The email ${requestedEmail} does not support password recovery. Please contact support.`,
    });
    // If the user is part of the list then the password will be sent to the user's email.
  } else {
    const message = `Estimado usuario,\n su contraseña para ingresar al servicio del Knowledge Centre es: ${exists.password}. \nPor favor no comparta esta contraseña con absolutamente nadie.`;
    sendEmail(requestedEmail, message);
    return res.status(200).json({
      status: 'ok',
      msg: `The password was sent to ${requestedEmail}.`,
    }); // url: '/account' });
  }
});

/**
 * 3)
 * Name : Signup
 * Method : POST
 * Route : /signup
 * Description : This route will let users signup to be able to use the application. In the list of users, only those who belong to the library are going to be able to sign up. Since this application has components which only certain people can manage, then it will not be available for everyone.
 */
users.post('/signup', function (req, res) {
  // The email comes from front
  const { localUser } = req.body;
  // This is the list of available admins.
  const admins = [
    'mariogomez@britishschool.edu.co',
    'kcpromoter@britishschool.edu.co',
    'biblioteca@britishschool.edu.co',
    'jpmercado@britishschool.edu.co',
    'ictdirector@britishschool.edu.co',
  ];

  // It the list includes the requested email then it will search for an entry inside the database to check if it already exists.
  if (admins.includes(localUser.username)) {
    AdminModel.findOne({ email: localUser.username }, function (error, exists) {
      if (error) {
        return res.send({
          status: 'error',
          msg: "Couldn't connect to database",
        });
      } else {
        // If the user already exists, then it will send a message saying that the user is already signed up.
        if (
          exists !== null &&
          exists !== undefined &&
          exists.email === localUser.username
        ) {
          return res.send({
            status: 'ok',
            msg: `The email ${exists.email} is already registered in our database.`,
          });
          // If the user is not part of the database list, then it will create a new entry with the necessary information.
        } else {
          const newAdmin = new AdminModel({
            password: localUser.password,
            email: localUser.username,
          });
          newAdmin.save(function (error) {
            if (error) {
              console.log(error);
              return res.send({
                status: 'error',
                msg: "Couldn't register new user to database",
              });
            }
            res.send({
              status: 'ok',
              msg: 'Thank you for subscribing! Welcome to the admins club!',
            });
          });
        }
      }
    });
  } else {
    res.send({
      status: 'Error',
      msg: `The email ${localUser.username} does not have admin permissions.`,
    });
  }
});

/**
 * 4)
 * Name : Blocked
 * Method : get
 * Route : /blocked_users
 * Description : This route will extract the list of users who are currently blocked from renting devices from the libray. Even if when renting, there is a validation first, with this route, the user will be able to fin easily the list of users or students who are blocked from renting devices.
 */
users.get('/blocked_users', async function (req, res) {
  // This is the list of available admins.
  const admins = [
    'mariogomez@britishschool.edu.co',
    'kcpromoter@britishschool.edu.co',
    'biblioteca@britishschool.edu.co',
    'jpmercado@britishschool.edu.co',
    'ictdirector@britishschool.edu.co',
  ];

  let listOfBlockedUsers = [];

  const blockedUsers = await UserModel.find({ blocked: true });

  blockedUsers
    ? (listOfBlockedUsers = blockedUsers)
    : (listOfBlockedUsers = []);
  res.send({
    status: 'Admins',
    msg: `This is the list of admins: ${admins}`,
    listOfBlockedUsers,
  });
});

exports.users = users;
