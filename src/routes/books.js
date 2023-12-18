const { Router } = require('express');
const books = Router();
const { UserModel } = require('../models/userModel');
const { BookModel } = require('../models/bookModel');
const nodemailer = require('nodemailer');
const NodeCache = require('node-cache');
const booksCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

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
 * Name : Rent books
 * Method : POST
 * Route : /rent
 * Description : This route will let the application receive the required information from frontend to be able to assign/rent a book to a certain user. The function receives a document number and a barcode. With this information it assigns the book to the user after checking all of the conditions required.
 */
books.post('/rent', async function (req, res) {
  // Document and barcode json come from frontend
  const { document, barcode, dueDate, admin } = req.body;
  console.log(`${getDateAndTime()}: Renting process started by ${admin}`);

  if (!document || !barcode || !dueDate) {
    res.send({
      status: 'Error',
      msg: 'Invalid user input. Please check all the fields and try again.',
    });
    return;
  }

  // Se separan los datos según el formato que trae la fecha XX-XX-XXXX
  const dateArr = dueDate.split('-');
  // Se revisa que la separación se haya realizado correctamente
  // console.log(dateArr);
  // Se crea una nueva string con el formato utilizado para las fechas.
  const fixedDate = dateArr[1] + '/' + dateArr[2] + '/' + dateArr[0];
  // console.log(fixedDate);
  // Then the code checks if both the user and book exist.
  const userExists = await UserModel.findOne({ document: Number(document) });
  const bookExists = await BookModel.findOne({
    barcode: barcode.toUpperCase(),
  });

  let status = '';
  let msg = '';

  if (!userExists) {
    status = 'Error';
    msg = 'User does not exist.';
    console.log(
      `${getDateAndTime()}: Renting process could not be completed because the user ${document} does not exist.`
    );
  } else if (userExists.blocked) {
    status = 'Error';
    msg = 'User has a fine that needs to be paid.';
    console.log(
      `${getDateAndTime()}: Renting process could not be completed because ${
        userExists.name + ' ' + userExists.lastName
      }has a fine.`
    );
  } else if (userExists.hasBookRented) {
    status = 'Error';
    msg = 'The user currently has a book rented.';
    console.log(
      `${getDateAndTime()}: Renting process could not be completed because ${
        userExists.name + ' ' + userExists.lastName
      } has a book rented.`
    );
  } else if (!bookExists) {
    status = 'Error';
    msg = 'Book is not registered in the database.';
    console.log(
      `${getDateAndTime()}: Renting process could not be completed because the book ${barcode} is not registered in the database.`
    );
  } else if (!bookExists.available) {
    status = 'Error';
    msg = 'This book is currently rented.';
    console.log(
      `${getDateAndTime()}: Renting process could not be completed because the book ${
        bookExists.title
      } is rented by another person.`
    );
  } else {
    console.log(
      `${getDateAndTime()}: User and Book data validation was completed successfully. Book and User entries will be updated.`
    );
    console.log(
      `${getDateAndTime()}: The book ${bookExists.title} with barcode ${
        bookExists.barcode
      } is going to be assigned to ${
        userExists.name + ' ' + userExists.lastName
      } from ${userExists.grade} by ${admin}.`
    );
    await BookModel.updateOne(
      { barcode: barcode.toUpperCase() },
      {
        $set: {
          // userDocument: Number(userExists.document),
          userDocument: Number(document),
          available: false,
          dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
        },
        $push: {
          rentalHistory: {
            userDocument: Number(userExists.document),
            dueDate: fixedDate,
            dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            dateReturned: null,
            conditions: null,
          },
        },
      }
    );
    // Update user rental history
    await UserModel.updateOne(
      { document: Number(document) },
      {
        $set: { hasBookRented: true },
        $push: {
          bookHistory: {
            barcode,
            dueDate: fixedDate,
            dateRented: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            dateReturned: null,
            conditions: null,
          },
        },
      }
    );
    // A message is stated to be sent to the client
    const message = `Dear user, \nYou have rented the book ${bookExists.title} with barcode ${bookExists.barcode} today. Please remember to return it by ${dueDate}.\nThanks for using our service.\nRegards,`;
    sendEmail(userExists.email, message);
    status = 'OK';
    msg = 'Book rented successfully.';
    console.log(
      `${getDateAndTime()}: Renting process finished succesfully by ${admin}`
    );
  }
  res.send({ status, msg });
});

/**
 * 2)
 * Name : Return books
 * Method : POST
 * Route : /return
 */
books.post('/return', async function (req, res) {
  const { barcode, admin } = req.body;
  let dueDate = '';
  console.log(
    `${getDateAndTime()}: Book return process started by ${admin} for the barcode: ${barcode}.`
  );

  // First we check if the barcode came from client side. If it didn't we send the msg to front and close the function.
  if (!barcode) {
    // console.log('There is no barcode');
    res.send({ status: 'Error', msg: 'Please enter a valid barcode' });
    return;
  }

  // We have to check if the books exists in database first and it is indeed rented.
  const bookExists = await BookModel.findOne({
    barcode: barcode.toUpperCase(),
    available: false,
  });

  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `The book ${barcode} does not appear to be currently rented right now in the database. If you believe this is a mistake, please contact ICT Support.`,
    });
    console.log(
      `${getDateAndTime()}: Book return process could not be completed because the book does not appear in the database or is not available.`
    );
  } else {
    dueDate =
      bookExists.rentalHistory[bookExists.rentalHistory.length - 1].dueDate;
    const userThatHasBook = await UserModel.findOne({
      document: bookExists.userDocument,
    });

    console.log(
      `${getDateAndTime()}: The book ${bookExists.title} with barcode ${
        bookExists.barcode
      } is going to be returned by ${
        userThatHasBook.name + ' ' + userThatHasBook.lastName
      } from ${userThatHasBook.grade} by ${admin}.`
    );
    await UserModel.updateOne(
      {
        document: bookExists.userDocument,
      },
      {
        $set: { hasBookRented: false },
        $push: {
          bookHistory: {
            barcode,
            dateRented: null,
            dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            conditions: null,
          },
        },
      }
    );
    await BookModel.updateOne(
      {
        barcode: barcode.toUpperCase(),
        available: false,
      },
      {
        $set: {
          userDocument: 0,
          available: true,
        },
        $push: {
          rentalHistory: {
            userDocument: bookExists.userDocument,
            dateRented: null,
            dateReturned: getDateAndTime()[0] + ' ' + getDateAndTime()[1],
            duetDate:
              bookExists.rentalHistory[bookExists.rentalHistory.length - 1],
            conditions: 'none',
          },
        },
      }
    );

    // A message declaration is stated to be sent via email to the user that returned the book.
    const message = `Dear user, \nYou returned the book ${bookExists.title} today. \nThanks for using our service.\nRegards,`;
    // A message is sent to client side to determine that everything went ok.
    res.send({
      status: 'Ok',
      msg: `The book ${bookExists.title} was returned by ${userThatHasBook.name} ${userThatHasBook.lastName} successfully. This book had to be returned on the following date: ${dueDate}`,
    });
    // The email is sent in the background
    sendEmail(userThatHasBook.email, message)
      .then(() => {
        console.log(
          `${getDateAndTime()}: Book return process completed successfully by ${admin}`
        );
      })
      .catch((error) => {
        console.error('Error sending email:', error);
        // Log the email error, but don't affect the client's response
      });

    // console.log(
    //   `${getDateAndTime()}: Book return process completed successfully by ${admin}`
    // );
    // sendEmail(userThatHasBook.email, message)
    //   .then(() => {
    //     console.log(
    //       `${getDateAndTime()}: Book return process completed successfully by ${admin}`
    //     );
    //     res.send({
    //       status: 'Ok',
    //       msg: `The book ${bookExists.title} was returned by ${userThatHasBook.name} ${userThatHasBook.lastName} successfully. This book had to be returned on the following date: ${dueDate}`,
    //     });
    //   })
    //   .catch((error) => {
    //     console.error('Error sending email:', error);
    //     res.status(500).send({
    //       status: 'OK',
    //       msg: `The book ${bookExists.title} was returned by ${userThatHasBook.name} ${userThatHasBook.lastName} successfully. This book had to be returned on the following date: ${dueDate}. PD: An error occurred while sending the email.`,
    //     });
    //   });
  }
});

/**
 * 3)
 * Name : Get book rented history
 * Method : GET
 * Route : /rented
 * Description : This route lets the frontend application display how many devices have been rented so far.
 */
books.get('/rented', async function (req, res) {
  // An object is initialized.
  let data = [];

  // Inside the records
  const rentedBooks = await BookModel.find({ available: false });
  const activeUsers = await UserModel.find({ hasBookRented: true });
  if (!rentedBooks) {
    res.send({
      status: 'Error',
      msg: 'Rented books could not be fetched from the Database.',
    });
  } else {
    const listOfRentedBooks = await activeUsers.map((user) => {
      const book = rentedBooks.find(
        (book) => book.userDocument === user.document
      );
      if (book) {
        // console.log(book.title);
        return {
          ...user._doc, // copy all properties of the user object
          title: book.title,
          barcode: book.barcode,
          author: book.author,
          conditions: book.conditions,
          // We take the last element of the rentalhistory array and grab the dateRented by converting it to isoString and taking only the date.
          dateRented:
            book.rentalHistory[book.rentalHistory.length - 1].dateRented,
        };
      }
      return user;
    });
    // console.log(listOfRentedBooks);
    data = listOfRentedBooks;
    // console.log(data);
    res.send({
      status: 'OK',
      msg: 'Rented books fetched succesfully',
      data,
    });
  }
});

/**
 * 4)
 * Name : Get book collection
 * Method : GET
 * Route : /search
 * Description : This route sends all of the book data to frontend so that users can search for any book they want.
 */
books.get('/search', async (req, res) => {
  // // An object is initialized.
  // let books = {};
  // // Inside the records
  // BookModel.find({}, function (error, allBooks) {
  //   if (error) {
  //     res.send({
  //       status: 'Error',
  //       msg: 'A connection to database could not be established.',
  //     });
  //   } else {
  //     books = allBooks;
  //     res.send({ status: 'ok', msg: 'Info found', books });
  //   }
  // });

  // Check the cache for the collection
  const cachedCollection = booksCache.get('bookCollection');

  if (cachedCollection) {
    return res.send({
      status: 'ok',
      msg: 'Info found',
      books: cachedCollection,
    });
  }

  // If data is not in the cache, fetch it from the database
  BookModel.find({})
    .lean()
    .exec((error, allBooks) => {
      if (error) {
        res.send({
          status: 'Error',
          msg: 'A connection to the database could not be established.',
        });
      } else {
        // Store the query result in the cache with a specified duration
        booksCache.set('bookCollection', allBooks, 3600);
        res.send({ status: 'ok', msg: 'Info found', books: allBooks });
      }
    });
});

/**
 * 5)
 * Name : Get book requested
 * Method : GET
 * Route : /getBook
 * Description : This route sends all of the book data to frontend so that users can search for any book they want.
 */
books.post('/getBook', async (req, res) => {
  // The barcode requested comes from client side.
  const { barcode, name } = req.body;
  const requestedBarcode = barcode.toUpperCase();

  console.log(
    `${getDateAndTime()}: A book search was started by ${name} with the following barcode: ${barcode}`
  );

  // The book is searched in the data base.
  const bookExists = await BookModel.findOne({ barcode: requestedBarcode });
  // console.log(bookExists);
  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `There is no entry for the barcode ${barcode} registered in our database.`,
    });
    console.log(
      'The book does not seem to exist in database and a message was sent to client.'
    );
  } else {
    res.send({ status: 'ok', msg: 'Book was found.', bookExists });
    console.log(
      `${getDateAndTime()}: The book search was finished succesfully by ${name} and the information was sent to client.`
    );
  }
});

/**
 * 6)
 * Name : Create a new book
 * Method : POST
 * Route : /newBook
 * Description : This route receives all of the new book's information from client side and creates a new entry in the collection.
 */
books.post('/new-book', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const { book, name } = req.body;
  console.log(`${getDateAndTime()}: Book creation started by ${name}`);
  if (
    book.title === undefined ||
    book.author === undefined ||
    book.barcode === undefined ||
    book.publicationYear === undefined ||
    book.isbn === undefined ||
    book.price === undefined ||
    book.materialType === undefined ||
    book.sublocation === undefined ||
    book.vendor === undefined ||
    book.circulationType === undefined ||
    book.conditions === undefined ||
    book.title === '' ||
    book.author === '' ||
    book.barcode === '' ||
    book.publicationYear === '' ||
    book.isbn === '' ||
    book.price === '' ||
    book.materialType === '' ||
    book.sublocation === '' ||
    book.vendor === '' ||
    book.circulationType === '' ||
    book.conditions === ''
  ) {
    res.send({
      status: 'Error',
      msg: 'Please make sure all fields are registered.',
    });
    console.log(
      `${getDateAndTime()}: The process could not be completed because not all fields were registered. A message was sent to the client.`
    );
  } else {
    //
    const bookExists = await BookModel.findOne({
      barcode: book.barcode.toUpperCase(),
    });

    if (bookExists) {
      res.send({
        status: 'Error',
        msg: `The barcode ${bookExists.barcode} is already registered in our database for the book ${bookExists.title}`,
      });
      console.log(
        `${getDateAndTime()}: The process could not be completed because the book already exists. A message was sent to client.`
      );
    } else {
      const newBook = new BookModel({
        userDocument: 0,
        title: book.title,
        author: book.author,
        barcode: book.barcode.toUpperCase(),
        publicationYear: book.publicationYear,
        isbn: book.isbn,
        price: book.price,
        materialType: book.materialType,
        sublocation: book.sublocation,
        vendor: book.vendor,
        circulationType: book.circulationType,
        dewey: book.dewey,
        conditions: book.conditions,
        dateRented: null,
        dateReturned: null,
        available: true,
        rentalHistory: [],
      });
      newBook.save(function (error) {
        if (error) {
          console.log(error);
          return res.send({
            status: 'error',
            msg: "Couldn't register new book in the database",
          });
        }

        console.log(
          `${getDateAndTime()}: The book ${book.title} with barcode ${
            book.barcode
          } was registered in the database by ${name}`
        );
        res.send({
          status: 'ok',
          msg: `The book ${book.title} was registered in our database successfully!`,
        });
      });
    }
  }
});

/**
 * 7)
 * Name : Update existing Book
 * Method : POST
 * Route : /update
 * Description : This route receives all of the new book's information from client side and creates a new entry in the collection.
 */
books.post('/update', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const { book, name } = req.body;

  console.log(`${getDateAndTime()}: Book update started by ${name}.`);
  //
  const bookExists = await BookModel.findOne({
    barcode: book.barcode.toUpperCase(),
  });

  // console.log(bookExists);

  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `The requested book does not appear in our database. If you believe this is a mistake, please contact ICT Support.`,
    });
    console.log(
      `${getDateAndTime()}: The process could not be completed because the book does not appear in the database. A message was sent to the client.`
    );
  } else {
    if (!bookExists.available) {
      console.log(
        `${getDateAndTime()}: Book update was not completed because book is in circulation.`
      );
      res.send({
        status: 'Error',
        msg: 'You cannot modify a book that is currently in circulation. Please make sure that it is available at the Library first.',
      });
    } else {
      await BookModel.updateOne(
        { barcode: book.barcode.toUpperCase() },
        {
          $set: {
            title: book.title,
            author: book.author,
            barcode: book.barcode,
            publicationYear: book.publicationYear,
            isbn: book.isbn,
            price: book.price,
            conditions: book.conditions,
            materialType: book.materialType,
            sublocation: book.sublocation,
            vendor: book.vendor,
            circulationType: book.circulationType,
            dewey: book.dewey,
            available: true,
          },
        }
      );
      res.send({
        status: 'ok',
        msg: 'Book was updated successfully. Please load the book again to check!',
      });
      console.log(
        `${getDateAndTime()}: The process was completed succesfully by ${name}.`
      );
    }
  }
});

/**
 * 8)
 * Name : Delete book from database
 * Method : POST
 * Route : /delete
 * Description : This route will eliminate the book from the database. The client sends a barcode and after many confirmations, decides to delete this book.
 */
books.post('/delete', async (req, res) => {
  // The book to be added to database comes from client side as an object.
  const { barcode, name } = req.body;

  console.log(`${getDateAndTime()}: Book deletion started by ${name}`);

  const bookToDeleteBarcode = barcode;

  //
  const bookExists = await BookModel.findOne({
    barcode: bookToDeleteBarcode.toUpperCase(),
  });

  if (!bookExists) {
    res.send({
      status: 'Error',
      msg: `The requested book does not appear in our database. If you believe this is a mistake, please contact ICT Support.`,
    });
    console.log(
      `${getDateAndTime()}: The process coulnd not be completed because the book does not seem to appear in the database. A message was sent to the client.`
    );
  } else {
    if (!bookExists.available) {
      console.log(
        `${getDateAndTime()}: Book deletion was not completed because book is in circulation.`
      );
      res.send({
        status: 'Error',
        msg: 'You cannot modify a book that is currently in circulation. Please make sure that it is available at the Library first.',
      });
    } else {
      await BookModel.deleteOne({ barcode: bookExists.barcode });
      console.log('Book was deleted');
      res.send({
        status: 'ok',
        msg: 'Book was deleted successfully. So sad to hear that book has gone away 😢',
      });
      console.log(
        `${getDateAndTime()}: The process was completed succesfully by ${name}.`
      );
    }
  }
});

/**
 * 9)
 * Name : Send notifications to one user
 * Method : POST
 * Route : /notification
 * Description : The purpose of this route is to send an email notification to a specific person, that the user decides via frontend.
 */
books.post('/notification', function (req, res) {
  // The recipient´s information is received via an object that comes from frontend.
  const { user } = req.body;

  // We extract the email from the object.
  const email = user.email;

  // console.log(user.title);

  // The text that is going to be sent, is written in prior hand.
  const mailText = `Dear ${user.name},\nYou have the book ${user.title} from the library currently rented. Please return it to the Knowledge Centre by the end of day.\nThank you very much!`;

  // We use the sendEmail function adding the email as first param and the text as the second param. A message indicating that everything worked is sent to Frontend.
  // sendEmail(email, mailText);
  // res.send({
  //   status: 'ok',
  //   msg: 'The user was notified by email.',
  // });
  sendEmail(email, mailText)
    .then(() => {
      res.send({
        status: 'ok',
        msg: 'The user was notified by email.',
      });
    })
    .catch((error) => {
      console.error('Error sending email:', error);
      res.status(500).send({
        status: 'error',
        msg: 'An error occurred while sending the email.',
      });
    });
});

exports.books = books;
