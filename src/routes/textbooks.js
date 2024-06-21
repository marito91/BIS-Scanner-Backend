const { Router } = require('express');
const textbooks = Router();
const { UserModel } = require('../models/userModel');
const { TextBookModel } = require('../models/textBookModel');
// const nodemailer = require('nodemailer');
const { getIo } = require('../socket');
const {
  insertLogIntoDatabase,
  sendEmail,
  getDateAndTime,
} = require('../helpers');

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

  insertLogIntoDatabase(
    getDateAndTime()[0],
    getDateAndTime()[1],
    `User textbook search was started by: ${admin} for the following document: ${document}.`
  );
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

  let txtToLog = '';
  if (!student) {
    status = 'Error';
    msg = 'Student was not found in our database.';
    console.log('Student was not found in the database.');
    txtToLog = 'Student was not found in the database.';
  } else {
    status = 'ok';
    msg = 'Student found succesfully';
    console.log('Student was found in the database.');
    txtToLog = 'Student was found in the database.';
  }
  rentedTextBooks.length > 0
    ? console.log(
        `A list of rented textbooks by the student will be sent to client.`
      )
    : console.log(`No rented textbooks were found. Array will be sent empty.`);

  rentedTextBooks.length > 0
    ? (txtToLog = `A list of rented textbooks by the student will be sent to client.`)
    : (txtToLog = `No rented textbooks were found. Array will be sent empty.`);

  insertLogIntoDatabase(
    getDateAndTime()[0],
    getDateAndTime()[1],
    `User textbook search finished by: ${admin}.` + txtToLog
  );
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
  insertLogIntoDatabase(
    getDateAndTime()[0],
    getDateAndTime()[1],
    `Textbook assignment was started by: ${admin} for student: ${student}. Textbooks: ${textbooksWithSamples}`
  );
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
    insertLogIntoDatabase(
      getDateAndTime()[0],
      getDateAndTime()[1],
      `Textbook assignment was completed successfully by: ${admin}. ${
        student.name + ' ' + student.lastName
      },has been assigned the following textbooks for the current school year: ${listOfTextbooks}`
    );
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
    insertLogIntoDatabase(
      getDateAndTime()[0],
      getDateAndTime()[1],
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

/**
 * 4)
 * Name : Return assigned text books
 * Method : POST
 * Route : /unassign
 * Description : This route will let the application receive the required information from frontend to be able to unassign/return a package of textbooks from a certain user. The function receives a student object number, an array of books to be returned and observations if there are any. With this information it unassigns all of the textbooks inside the array to the user after checking all of the conditions required.
 */
textbooks.post('/unassign', async function (req, res) {
  const { student, textbooksWithSamples, observations, admin } = req.body;

  // console.log('The following data mathes the student:');
  // console.log(student);
  // console.log(typeof student);
  if (!student || !textbooksWithSamples) {
    return res.send({
      status: 'Error',
      msg: 'No information regarding textbooks was received. Please contact ICT Support.',
    });
  }
  insertLogIntoDatabase(
    getDateAndTime()[0],
    getDateAndTime()[1],
    `Textbook assignment was started by: ${admin} for student: ${student}. Textbooks: ${textbooksWithSamples}`
  );
  console.log(
    `${getDateAndTime()}: Textbook unassignment was started by: ${admin}`
  );

  const listOfTextbooks = [];
  const errorMessages = [];

  try {
    for (const textbook of textbooksWithSamples) {
      // Check if textbook.sample is a valid number
      if (isNaN(textbook.sample)) {
        console.log(`Invalid sample number: ${textbook.sample}. Skipping.`);
        errorMessages.push(
          `The following textbook was not returned because of an invalid sample number:\n ${textbook.title}.\nSample number received: ${textbook.sample}`
        );
        continue; // Continue to the next iteration of the loop
      }
      // Textbook is searched in database.
      const textBookExists = await TextBookModel.findOne({
        title: textbook.title,
        number: Number(textbook.sample),
        userDocument: Number(student.document),
      });

      if (!textBookExists) {
        console.log(
          `${textbook.title} number ${textbook.sample} does not seem to exist in the database or doesn't seem to match with student.`
        );
        errorMessages.push(
          `${textbook.title} number ${textbook.sample} doesn't seem to exist in the database or doesn't seem to match with student.`
        );
        continue; // Continue to the next iteration of the loop
      } else {
        console.log(
          `${textbook.title} number ${textbook.sample} is available in the database.`
        );
        // Check if the textbook is available
        if (
          textBookExists.available &&
          textBookExists.userDocument === Number(student.document)
        ) {
          console.log(
            `${textbook.title} number ${textbook.sample} doesn't match with student ${student}. Skipping update.`
          );
          // Send response to frontend indicating unavailability
          errorMessages.push(
            `${textbook.title} number ${textbook.sample} figures as available for rent so it was not unassigned or doesn't match with student ${student}. If you believe this is a mistake, contact ICT Support.`
          );
          continue; // Continue to the next iteration of the loop
        }

        await TextBookModel.updateOne(
          { title: textbook.title, number: Number(textbook.sample) },
          {
            $set: {
              userDocument: 0,
              available: true,
              dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            },
            $push: {
              rentalHistory: {
                userDocument: Number(student.document),
                dateRented: textbook.dateRented,
                dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
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
                dateRented: textbook.dateRented,
                dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
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
        `Some errors were encountered during the unassignment process.`
      );
      return res.send({
        status: 'error',
        msg: errorMessages.join('\n'),
      });
    }

    const message = `Dear ${
      student.name + ' ' + student.lastName
    }, \nYou have returned the following textbooks for the current school year: \n\n${listOfTextbooks} \nIf you have more textbooks left, please return them to the Knowledge Centre.\nThanks for using our service.\nRegards,`;

    sendEmail([student.email, 'kc@britishschool.edu.co'], message);
    insertLogIntoDatabase(
      getDateAndTime()[0],
      getDateAndTime()[1],
      `Textbook unassignment was completed successfully by: ${admin}. ${
        student.name + ' ' + student.lastName
      },has returned the following textbooks: ${listOfTextbooks} `
    );
    console.log(
      `${getDateAndTime()}: Textbook unassignment was completed successfully by: ${admin}`
    );

    return res.send({
      status: 'ok',
      msg: `Textbooks unassigned successfully.`,
    });
  } catch (error) {
    console.error('Error:', error);
    console.log(
      `Some errors were encountered during the assignment process and it could not be completed.`
    );
    insertLogIntoDatabase(
      getDateAndTime()[0],
      getDateAndTime()[1],
      `Some errors were encountered during the assignment process and it could not be completed.`
    );
    return res.send({
      status: 'error',
      msg: 'An error occurred while trying to assign textbooks. Please contact ICT Support.',
    });
  }
});

/**
 * 5)
 * Name : Return single assigned textbook
 * Method : POST
 * Route : /unassign-one
 * Description : This route will let the application receive the required information from frontend to be able to unassign/return a single textbook from a certain user. The function receives a student object and textbook information. With this information it unassigns the textbook to the user after checking all of the conditions required.
 */
textbooks.post('/unassign-one', async function (req, res) {
  const { userThatHasTb, textbookToUnassign, admin } = req.body;

  // console.log('The following data mathes the student:');
  // console.log(student);
  // console.log(typeof student);
  if (!userThatHasTb || !textbookToUnassign) {
    return res.send({
      status: 'Error',
      msg: 'No information regarding textbooks was received. Please contact ICT Support.',
    });
  }
  // insertLogIntoDatabase(
  //   getDateAndTime()[0],
  //   getDateAndTime()[1],
  //   `Textbook assignment was started by: ${admin} for student: ${
  //     userThatHasTb.name +
  //     ' ' +
  //     userThatHasTb.lastName +
  //     ' with document ' +
  //     userThatHasTb.document
  //   }. Textbook: ${
  //     textbookToUnassign.title + ' # ' + textbookToUnassign.sample
  //   }`
  // );
  console.log(
    `${getDateAndTime()}: Textbook unassignment was started by: ${admin}`
  );

  const errorMessages = [];

  if (isNaN(textbookToUnassign.sample)) {
    console.log(`Invalid sample number: ${textbookToUnassign.sample}.`);
    errorMessages.push(
      `The textbook was not returned because of an invalid sample number:\n ${textbookToUnassign.title}.\nSample number received: ${textbookToUnassign.sample}`
    );
  }

  try {
    // Textbook is searched in database.
    const textBookExists = await TextBookModel.findOne({
      title: textbookToUnassign.title,
      number: Number(textbookToUnassign.sample),
      userDocument: Number(userThatHasTb.document),
    });
    if (!textBookExists) {
      console.log(
        `${textbookToUnassign.title} number ${textbookToUnassign.sample} does not seem to exist in the database or doesn't seem to match with student.`
      );
      errorMessages.push(
        `${textbookToUnassign.title} number ${textbookToUnassign.sample} doesn't seem to exist in the database or doesn't seem to match with student.`
      );
    } else {
      console.log(
        `${textbookToUnassign.title} number ${textbookToUnassign.sample} is available in the database.`
      );
      // Check if the textbookToUnassign is available
      if (
        textBookExists.available &&
        textBookExists.userDocument === Number(userThatHasTb.document)
      ) {
        console.log(
          `${textbookToUnassign.title} number ${textbookToUnassign.sample} doesn't match with student ${userThatHasTb.document}. Skipping update.`
        );
        // Send response to frontend indicating unavailability
        errorMessages.push(
          `${textbookToUnassign.title} number ${
            textbookToUnassign.sample
          } figures as available for rent so it was not unassigned or doesn't match with student ${
            userThatHasTb.name +
            ' ' +
            userThatHasTb.lastName +
            ' with document ' +
            userThatHasTb.document
          }. If you believe this is a mistake, contact ICT Support.`
        );
      }

      await TextBookModel.updateOne(
        {
          title: textbookToUnassign.title,
          number: Number(textbookToUnassign.sample),
        },
        {
          $set: {
            userDocument: 0,
            available: true,
            dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
          },
          $push: {
            rentalHistory: {
              userDocument: Number(userThatHasTb.document),
              dateRented: textbookToUnassign.dateRented,
              dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
              conditions: 'none',
            },
          },
        }
      );

      await UserModel.updateOne(
        { document: Number(userThatHasTb.document) },
        {
          $push: {
            textbookHistory: {
              textbook: textbookToUnassign.title,
              number: Number(textbookToUnassign.sample),
              dateRented: textbookToUnassign.dateRented,
              dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
              conditions: 'none',
            },
          },
        }
      );

      console.log('Update successful');
    }
    if (errorMessages.length > 0) {
      console.log(
        `Some errors were encountered during the unassignment process.`
      );
      return res.send({
        status: 'error',
        msg: errorMessages.join('\n'),
      });
    }

    const message = `Dear ${
      userThatHasTb.name + ' ' + userThatHasTb.lastName
    }, \nYou have returned the following textbook for the current school year: \n\n${
      textbookToUnassign.title + ' #' + textbookToUnassign.sample
    } \nIf you have more textbooks left, please return them to the Knowledge Centre.\nThanks for using our service.\nRegards,`;

    sendEmail([userThatHasTb.email, 'kc@britishschool.edu.co'], message);
    // insertLogIntoDatabase(
    //   getDateAndTime()[0],
    //   getDateAndTime()[1],
    //   `Textbook unassignment was completed successfully by: ${admin}. ${
    //     userThatHasTb.name + ' ' + userThatHasTb.lastName
    //   }, has returned the following textbook: ${textbookToUnassign.title + ' #' + textbookToUnassign.sample} `
    // );
    console.log(
      `${getDateAndTime()}: Textbook unassignment was completed successfully by: ${admin}`
    );

    return res.send({
      status: 'ok',
      msg: `Textbooks unassigned successfully.`,
    });

    // If there are error messages, send them to the frontend and return early
  } catch (error) {
    console.error('Error:', error);
    console.log(
      `Some errors were encountered during the assignment process and it could not be completed.`
    );
    // insertLogIntoDatabase(
    //   getDateAndTime()[0],
    //   getDateAndTime()[1],
    //   `Some errors were encountered during the assignment process and it could not be completed.`
    // );
    return res.send({
      status: 'error',
      msg: 'An error occurred while trying to assign textbooks. Please contact ICT Support.',
    });
  }
});

exports.textbooks = textbooks;
