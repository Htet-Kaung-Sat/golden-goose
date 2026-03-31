"use strict";

const { Desk } = require("../models");

const CAMERA_URLS = [
  "https://cctv.yarchang.net/265068c7-b7ff-4b0b-9eef-0ceb3f31f1b7.html",
  "https://cctv.yarchang.net/2ae120c2-0fdf-46fc-b2bc-362782fab761.html",
  "https://cctv.yarchang.net/c08f9d5e-5a5d-4a10-ba34-1e691279fc16.html",
  "https://cctv.yarchang.net/6a5f2057-bafe-4658-a718-ac2c803b3304.html",
  "https://cctv.yarchang.net/686ba36a-1f5d-49ca-8484-1c07804df16f.html",
  "https://cctv.yarchang.net/5efd5130-e4ef-499f-9c88-a153dfc9cf76.html",
];

function randomUrl() {
  return CAMERA_URLS[Math.floor(Math.random() * CAMERA_URLS.length)];
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();
    const desks = await Desk.findAll({ order: [["id", "ASC"]] });

    if (desks.length === 0) {
      console.warn("No desks found. Run desk seeder first. Skipping camera seeder.");
      return;
    }

    const camerasToInsert = [];

    // Homepage cameras (desk_id = null)
    camerasToInsert.push(
      {
        desk_id: null,
        camera_no: "01",
        position: "MAIN",
        url: randomUrl(),
        status: "ACTIVE",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        desk_id: null,
        camera_no: "02",
        position: "SIDE",
        url: randomUrl(),
        status: "ACTIVE",
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );

    for (const desk of desks) {
      camerasToInsert.push(
        {
          desk_id: desk.id,
          camera_no: "01",
          position: "MAIN",
          url: randomUrl(),
          status: "ACTIVE",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          desk_id: desk.id,
          camera_no: "02",
          position: "SIDE",
          url: randomUrl(),
          status: "ACTIVE",
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      );
    }

    await queryInterface.bulkInsert("Cameras", camerasToInsert, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Cameras", {}, {});
  },
};
