const nodemailer = require('nodemailer');

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

export default sendEmail;
