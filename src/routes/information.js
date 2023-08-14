const { Router } = require('express');
const information = Router();
const { DeviceModel } = require('../models/deviceModel');
const { UserModel } = require('../models/userModel');
const nodemailer = require('nodemailer');

exports.information = information;
