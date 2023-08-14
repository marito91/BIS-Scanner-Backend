const { Router } = require('express');
const textbooks = Router();
const { UserModel } = require('../models/userModel');
const { TextBookModel } = require('../models/textBookModel');
const nodemailer = require('nodemailer');

/**
 * X)
 * Name: Test Data
 * Method : Local
 * Route: None
 * Params:
 */

const testData = [
  {
    document: 123,
    section: 'PRIMARIA',
    grade: '3A',
    name: 'Fulanito',
    lastName: 'Perez',
    email: 'mariogomez@britishschool.edu.co',
    blocked: false,
    hasDeviceRented: false,
    hasBookRented: false,
    hasTextBookRented: false,
    devicehistory: [],
    bookHistory: [],
    textBookHistory: [],
  },
  {
    document: 456,
    section: 'PRIMARIA',
    grade: '5B',
    name: 'Pedrito',
    lastName: 'Coral',
    email: 'mariogomez@britishschool.edu.co',
    blocked: false,
    hasDeviceRented: false,
    hasBookRented: false,
    hasTextBookRented: false,
    devicehistory: [],
    bookHistory: [],
    textBookHistory: [],
  },
  {
    document: 789,
    section: 'SECUNDARIA',
    grade: '7A',
    name: 'Mayerli',
    lastName: 'Pacheco',
    email: 'mariogomez@britishschool.edu.co',
    blocked: false,
    hasDeviceRented: false,
    hasBookRented: false,
    hasTextBookRented: true,
    devicehistory: [],
    bookHistory: [],
    textBookHistory: [],
  },
  {
    document: 987,
    section: 'SECUNDARIA',
    grade: '9C',
    name: 'Enrique',
    lastName: 'Bueno Lindo',
    email: 'mariogomez@britishschool.edu.co',
    blocked: false,
    hasDeviceRented: false,
    hasBookRented: false,
    hasTextBookRented: false,
    devicehistory: [],
    bookHistory: [],
    textBookHistory: [],
  },
  {
    document: 654,
    section: 'SECUNDARIA',
    grade: '13B',
    name: 'Delfina',
    lastName: 'Pataquiva',
    email: 'mariogomez@britishschool.edu.co',
    blocked: false,
    hasDeviceRented: false,
    hasBookRented: false,
    hasTextBookRented: false,
    devicehistory: [],
    bookHistory: [],
    textBookHistory: [],
  },
  {
    document: 321,
    section: 'PRIMARIA',
    grade: 'STAFF',
    name: 'Yadira',
    lastName: 'Pacheco',
    email: 'mariogomez@britishschool.edu.co',
    blocked: false,
    hasDeviceRented: false,
    hasBookRented: false,
    hasTextBookRented: false,
    devicehistory: [],
    bookHistory: [],
    textBookHistory: [],
  },
];
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

  today = mm + '/' + dd + '/' + yyyy;
  // Saca hora actual
  const time = h + ':' + m;

  return [today, time];
}

/**
 * 1)
 * Name : Load Users
 * Method : GET
 * Route : /loadStudent
 * Description : This route will send the selected user to front end.
 */

textbooks.post('/loadStudent', async function (req, res) {
  // Document and barcode json come from frontend
  const { document } = req.body;

  if (!document) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check all the fields and try again.',
    });
    return;
  }

  const student = await UserModel.findOne({
    document: Number(document),
  });

  let status = '';
  let msg = '';

  if (!student) {
    status = 'Error';
    msg = 'Student was not found in our database.';
  } else {
    status = 'ok';
    msg = 'Student found succesfully';
  }

  res.send({ status, msg, student });
});

/**
 * 2)
 * Name : Assign text books
 * Method : POST
 * Route : /assign
 * Description : This route will let the application receive the required information from frontend to be able to assign/rent a package of books to a certain user. The function receives a document number and an array of books to be assigned. With this information it assigns all of the textbooks inside the array to the user after checking all of the conditions required.
 */

// const bookExists = TextBookModel.findOne({
//   grades: 4,
// });

// console.log(bookExists);

textbooks.post('/assign', async function (req, res) {
  // Document and barcode json come from frontend
  const { student, textbooksWithSamples, observations } = req.body;

  if (!student || !textbooksWithSamples) {
    res.send({
      status: 'Error',
      msg: 'No information regarding textbooks was received. Please contact ICT Support.',
    });
    return;
  } else {
    // const textBookExists = await TextBookModel.findOne({
    //   title: text,
    // });
    await textbooksWithSamples.forEach((textbook) => {
      console.log('Title: ' + textbook.title);
      console.log('Number: ' + textbook.sample);
      const textBookExists = TextBookModel.findOne({
        title: textbook.title,
        number: Number(textbook.sample),
      });

      if (textBookExists) {
        console.log(
          `${textbook.title} number ${textbook.sample} is available in database.`
        );
      } else {
        console.log(
          `${textbook.title} number ${textbook.sample} is NOT available in database.`
        );
      }
    });

    // console.log(student);
    // console.log(textbooksWithSamples);
    // console.log(observations);
  }

  // Textbooks needs to be updated

  // Loop textbooksWithSamples to check each textbook and make the necesary updates.

  // Looks for textbook by title and number (student was already validated before assigning textbooks) and check if it exists

  // Checks that it is available

  // If it is available:
  // available: false
  // userDocument: student.document
  // dateRented: new date
  // rentalHistory: userdocument, daterented, observations

  // Send email with confirmation and all information to student and kc email.

  // // Se separan los datos según el formato que trae la fecha XX-XX-XXXX
  // const dateArr = dueDate.split('-');
  // // Se revisa que la separación se haya realizado correctamente
  // console.log(dateArr);
  // // Se crea una nueva string con el formato utilizado para las fechas.
  // const fixedDate = dateArr[1] + '/' + dateArr[2] + '/' + dateArr[0];
  // console.log(fixedDate);
  // // Then the code checks if both the user and book exist.
  // const userExists = await UserModel.findOne({ document: Number(document) });
  // const textBookExists = await TextBookModel.findOne({
  //   grades: 4,
  // });

  // let status = '';
  // let msg = '';

  //   if (!userExists) {
  //     status = 'Error';
  //     msg = 'User does not exist.';
  //   } else if (userExists.blocked) {
  //     status = 'Error';
  //     msg = 'User has a fine that needs to be paid.';
  //   } else if (userExists.hasBookRented) {
  //     status = 'Error';
  //     msg = 'The user currently has a book rented.';
  //   } else if (!bookExists) {
  //     status = 'Error';
  //     msg = 'Book is not registered in the database.';
  //   } else if (!bookExists.available) {
  //     status = 'Error';
  //     msg = 'This book is currently rented.';
  //   } else {
  //     await BookModel.updateOne(
  //       { barcode },
  //       {
  //         $set: {
  //           userDocument: Number(userExists.document),
  //           available: false,
  //           dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
  //         },
  //         $push: {
  //           rentalHistory: {
  //             userDocument: Number(userExists.document),
  //             dueDate: fixedDate,
  //             dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
  //             dateReturned: null,
  //             conditions: null,
  //           },
  //         },
  //       }
  //     );
  //     // Update user rental history
  //     await UserModel.updateOne(
  //       { document: Number(document) },
  //       {
  //         $set: { hasBookRented: true },
  //         $push: {
  //           bookHistory: {
  //             barcode,
  //             dueDate: fixedDate,
  //             dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
  //             dateReturned: null,
  //             conditions: null,
  //           },
  //         },
  //       }
  //     );
  //     // A message is stated to be sent to the client
  //     const message = `Dear user, \nYou have rented the book ${bookExists.title} today. Please remember to return it by ${dueDate}.\nThanks for using our service.\nRegards,`;
  //     sendEmail(userExists.email, message);
  //     status = 'OK';
  //     msg = 'Book rented successfully.';
  //   }
  res.send({ status: 'ok', msg: 'Console logged succesfully.' });
});

exports.textbooks = textbooks;
