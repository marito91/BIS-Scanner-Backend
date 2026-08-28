# BIS Knowledge Centre Device Manager (Backend)

Backend API and server for the Knowledge Centre device management system at the British International School. Handles device check-out and check-in logic and connects to MongoDB for persistent storage of user and movement records.

## Overview

This service exposes the routes and data models the frontend app (BIS-Scanner---WebApp) uses to check devices in and out. Every loan or return is validated against the database and logged as a movement record, creating a full audit trail of device usage.

## Endpoints
- Loan: receives loan details from the frontend (user info, device and number, timestamp), validates them, and writes the loan record to the database
- Return: validates the device and its number against active loans, registers the return, and releases the device back into circulation
- Movement history: every loan or return automatically generates a movement record for historical tracking
## Tech Stack

Node.js, Express, MongoDB.

## Setup

This service depends on a MongoDB connection, which is kept private and not included in this repository. Configure your own connection before running locally.

## Context

Built and maintained as part of technology operations at the British International School's Knowledge Centre; paired with the BIS-Scanner---WebApp frontend to support the school's shared-device lending program.
