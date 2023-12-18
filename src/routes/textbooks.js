const { Router } = require('express');
const textbooks = Router();
const { UserModel } = require('../models/userModel');
const { TextBookModel } = require('../models/textBookModel');
const nodemailer = require('nodemailer');
const { getIo } = require('../socket');

/**
 * X)
 * Name: Test Data
 * Method : Local
 * Route: None
 * Params:
 */

// const testData = [
//   {
//     document: 123,
//     section: 'PRIMARIA',
//     grade: '3A',
//     name: 'Fulanito',
//     lastName: 'Perez',
//     email: 'mariogomez@britishschool.edu.co',
//     blocked: false,
//     hasDeviceRented: false,
//     hasBookRented: false,
//     hasTextBookRented: false,
//     devicehistory: [],
//     bookHistory: [],
//     textBookHistory: [],
//   },
//   {
//     document: 456,
//     section: 'PRIMARIA',
//     grade: '5B',
//     name: 'Pedrito',
//     lastName: 'Coral',
//     email: 'mariogomez@britishschool.edu.co',
//     blocked: false,
//     hasDeviceRented: false,
//     hasBookRented: false,
//     hasTextBookRented: false,
//     devicehistory: [],
//     bookHistory: [],
//     textBookHistory: [],
//   },
//   {
//     document: 789,
//     section: 'SECUNDARIA',
//     grade: '7A',
//     name: 'Mayerli',
//     lastName: 'Pacheco',
//     email: 'mariogomez@britishschool.edu.co',
//     blocked: false,
//     hasDeviceRented: false,
//     hasBookRented: false,
//     hasTextBookRented: true,
//     devicehistory: [],
//     bookHistory: [],
//     textBookHistory: [],
//   },
//   {
//     document: 987,
//     section: 'SECUNDARIA',
//     grade: '9C',
//     name: 'Enrique',
//     lastName: 'Bueno Lindo',
//     email: 'mariogomez@britishschool.edu.co',
//     blocked: false,
//     hasDeviceRented: false,
//     hasBookRented: false,
//     hasTextBookRented: false,
//     devicehistory: [],
//     bookHistory: [],
//     textBookHistory: [],
//   },
//   {
//     document: 654,
//     section: 'SECUNDARIA',
//     grade: '13B',
//     name: 'Delfina',
//     lastName: 'Pataquiva',
//     email: 'mariogomez@britishschool.edu.co',
//     blocked: false,
//     hasDeviceRented: false,
//     hasBookRented: false,
//     hasTextBookRented: false,
//     devicehistory: [],
//     bookHistory: [],
//     textBookHistory: [],
//   },
//   {
//     document: 321,
//     section: 'PRIMARIA',
//     grade: 'STAFF',
//     name: 'Yadira',
//     lastName: 'Pacheco',
//     email: 'mariogomez@britishschool.edu.co',
//     blocked: false,
//     hasDeviceRented: false,
//     hasBookRented: false,
//     hasTextBookRented: false,
//     devicehistory: [],
//     bookHistory: [],
//     textBookHistory: [],
//   },
// ];
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

/**
 * 1)
 * Name : Load Users
 * Method : GET
 * Route : /loadStudent
 * Description : This route will send the selected user to front end.
 */

textbooks.post('/loadStudent', async function (req, res) {
  // Document and barcode json come from frontend
  const { document, admin } = req.body;

  if (!document) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check all the fields and try again.',
    });
    return;
  }

  console.log(
    `${getDateAndTime()}: User textbook search was started by: ${admin} for the following document: ${document}`
  );

  const student = await UserModel.findOne({
    document: Number(document),
  });

  const rentedTextBooks = await TextBookModel.find({ userDocument: document });

  console.log('Textbooks found: ');
  rentedTextBooks.forEach((text) =>
    console.log(text.title + ' # ' + text.number)
  );

  let status = '';
  let msg = '';

  if (!student) {
    status = 'Error';
    msg = 'Student was not found in our database.';
    console.log('Student was not found in the database.');
  } else {
    status = 'ok';
    msg = 'Student found succesfully';
    console.log('Student was found in the database.');
  }
  rentedTextBooks.length > 0
    ? console.log(
        `A list of rented textbooks by the student will be sent to client.`
      )
    : console.log(`No rented textbooks were found. Array will be sent empty.`);

  console.log(
    `${getDateAndTime()}: User textbook search finished by: ${admin}.`
  );
  res.send({ status, msg, student, rentedTextBooks });
});

/**
 * 2)
 * Name : Assign text books
 * Method : POST
 * Route : /assign
 * Description : This route will let the application receive the required information from frontend to be able to assign/rent a package of textbooks to a certain user. The function receives a student object number, an array of books to be assigned and observations if there are any. With this information it assigns all of the textbooks inside the array to the user after checking all of the conditions required.
 */
textbooks.post('/assign', async function (req, res) {
  const { student, textbooksWithSamples, observations, admin } = req.body;

  if (!student || !textbooksWithSamples) {
    return res.send({
      status: 'Error',
      msg: 'No information regarding textbooks was received. Please contact ICT Support.',
    });
  }
  console.log(
    `${getDateAndTime()}: Textbook assignment was started by: ${admin}`
  );

  const listOfTextbooks = [];
  const errorMessages = [];

  try {
    for (const textbook of textbooksWithSamples) {
      // Check if textbook.sample is a valid number
      if (isNaN(textbook.sample)) {
        console.log(`Invalid sample number: ${textbook.sample}. Skipping.`);
        errorMessages.push(
          `The following textbook was not assigned because of an invalid sample number:\n ${textbook.title}.\nSample number received: ${textbook.sample}`
        );
        continue; // Continue to the next iteration of the loop
      }
      // Textbook is searched in database.
      const textBookExists = await TextBookModel.findOne({
        title: textbook.title,
        number: Number(textbook.sample),
      });

      if (!textBookExists) {
        console.log(
          `${textbook.title} number ${textbook.sample} is NOT available in the database.`
        );
        errorMessages.push(
          `${textbook.title} number ${textbook.sample} is NOT available in the database.`
        );
        continue; // Continue to the next iteration of the loop
      } else {
        console.log(
          `${textbook.title} number ${textbook.sample} is available in the database.`
        );
        // Check if the textbook is available
        if (!textBookExists.available) {
          console.log(
            `${textbook.title} number ${textbook.sample} is not available for update. Skipping update.`
          );
          // Send response to frontend indicating unavailability
          errorMessages.push(
            `${textbook.title} number ${textbook.sample} is not available for assignment so it was not assigned. If you believe this is a mistake, contact ICT Support.`
          );
          continue; // Continue to the next iteration of the loop
        }

        await TextBookModel.updateOne(
          { title: textbook.title, number: Number(textbook.sample) },
          {
            $set: {
              userDocument: Number(student.document),
              available: false,
              dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            },
            $push: {
              rentalHistory: {
                userDocument: Number(student.document),
                dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
                dateReturned: null,
                conditions: !observations ? 'none' : observations,
              },
            },
          }
        );

        await UserModel.updateOne(
          { document: Number(student.document) },
          {
            $push: {
              textbookHistory: {
                textbook: textbook.title,
                number: Number(textbook.sample),
                dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
                dateReturned: null,
                conditions: !observations ? 'none' : observations,
              },
            },
          }
        );

        listOfTextbooks.push(textbook.title + ' #' + textbook.sample + '\n');
        console.log('Update successful');
      }
    }
    // If there are error messages, send them to the frontend and return early
    if (errorMessages.length > 0) {
      console.log(
        `Some errors were encountered during the assignment process.`
      );
      return res.send({
        status: 'error',
        msg: errorMessages.join('\n'),
      });
    }

    const message = `Dear ${
      student.name + ' ' + student.lastName
    }, \nYou have been assigned the following textbooks for the current school year: \n\n${listOfTextbooks} \nPlease remember to take care of them and use them with responsibility.\nThanks for using our service.\nRegards,`;

    sendEmail([student.email, 'kc@britishschool.edu.co'], message);
    console.log(
      `${getDateAndTime()}: Textbook assignment was completed successfully by: ${admin}`
    );

    return res.send({
      status: 'ok',
      msg: `Textbooks assigned successfully.`,
    });
  } catch (error) {
    console.error('Error:', error);
    console.log(
      `Some errors were encountered during the assignment process and it could not be completed.`
    );
    return res.send({
      status: 'error',
      msg: 'An error occurred while trying to assign textbooks. Please contact ICT Support.',
    });
  }
});

/**
 * 3)
 * Name : Get rented textbooks
 * Method : GET
 * Route : /rented
 * Description : This route sends an array of rented textbooks and their active users.
 */
textbooks.get('/rented', async function (req, res) {
  const io = getIo(); // Access 'io' from the Express app
  const userMap = new Map();

  const rentedTextBooks = await TextBookModel.find({ available: false });
  console.log('Rented textbooks total: ' + rentedTextBooks.length);
  const usersWithTextbooks = await UserModel.find({
    'textbookHistory.0': { $exists: true, $ne: [] },
  });

  for (const user of usersWithTextbooks) {
    // The textbooks rented by the student are filtered
    const indexedTextbooks = rentedTextBooks.filter(
      (textbook) => textbook.userDocument === user.document
    );

    if (userMap.has(user.document)) {
      const existingUser = userMap.get(user.document);
      indexedTextbooks.forEach((textbook) =>
        existingUser.textbooks.push({
          title: textbook.title,
          sample: textbook.number,
          dateRented: textbook.dateRented,
        })
      );
    } else {
      const textbooksToAdd = indexedTextbooks.map((textbook) => ({
        title: textbook.title,
        sample: textbook.number,
        dateRented: textbook.dateRented,
      }));

      // If not, add the user to the map
      userMap.set(user.document, {
        document: user.document,
        name: user.name,
        lastName: user.lastName,
        section: user.section,
        grade: user.grade,
        email: user.email,
        textbooks: textbooksToAdd,
      });
    }
  }

  // Convert the map values (unique users) to an array
  const users = Array.from(userMap.values());
  io.sockets.emit('rentedTextbooks', users);
  res.send({
    status: 'OK',
    msg: 'Rented textbooks fetched succesfully',
    data: users,
  });
});

exports.textbooks = textbooks;
