const nodemailer = require('nodemailer');
const { UserLogModel } = require('./models/userLogModel');

const insertLogIntoDatabase = async (date, time, text) => {
  try {
    // Create a new log document using the UserLogModel
    const log = new UserLogModel({
      date,
      time,
      text,
    });

    // Save the log document to the database
    await log.save();

    console.log('Log inserted into database successfully.');
  } catch (error) {
    console.error('Error inserting log into database:', error);
  }
};

/**
 * X)
 * Name : Send Email
 * Method : Local Function
 * Route : None
 * Params : Array with a list of emails and a string with the message to be sent.
 * Description : This function is meant to be used each time a notification via email needs to be sent to any user. The function receives a list of emails and a message.
 */
function sendEmail(emailList, msg) {
  return new Promise((resolve, reject) => {
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
        console.error(error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
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

  today = mm + '/' + dd + '/' + yyyy;
  // Saca hora actual
  const time = h + ':' + m;

  return [today, time];
}

module.exports = { insertLogIntoDatabase, sendEmail, getDateAndTime };
