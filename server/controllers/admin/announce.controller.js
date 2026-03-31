const { Announce, User, Role, sequelize } = require("../../models/index.js");
const { response } = require("../../utils/response.js");
const { Op } = require("sequelize");
const { operateAnnouncesSchema } = require("../../validations/announce.validation.js");

/* Getting Announce Data Function */
const getAnnounces = async (req, res) => {
  try {
    const { type, rowLimit } = req.query;
    const announces = await Announce.findAll({
      where: { type: type },
      include: [{ model: User, as: "user" }],
      order: [["updatedAt", "DESC"]],
      ...(rowLimit ? { limit: Number(rowLimit) } : {}),
    });
    response(res, 200, true, "Announce fetched successfully", { announces });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

/* CRUD Operation for Announcement Data */
const operateAnnounces = async (req, res) => {
  const { error, value } = operateAnnouncesSchema.validate(req.body);
  if (error) return response(res, 400, false, error.details[0].message);

  const t = await sequelize.transaction();
  try {
    if (value.creates && value.creates.length > 0) {
      const insertData = value.creates.map((item) => ({
        title: item.title,
        content: item.content,
        user_id: item.user_id,
        type: item.type != null ? item.type : 0,
      }));
      await Announce.bulkCreate(insertData, { transaction: t });
    }
    if (value.updates && value.updates.length > 0) {
      for (const item of value.updates) {
        await Announce.update(
          {
            title: item.title,
            content: item.content,
            user_id: item.user_id,
          },
          {
            where: { id: item.id },
            transaction: t,
          },
        );
      }
    }
    if (value.deletes?.length > 0) {
      const dateleData = value.deletes;
      await Announce.destroy({
        where: { id: dateleData },
        transaction: t,
      });
    }
    await t.commit();
    response(res, 200, true, "Data Operate Successfully.");
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

/* Member Overview for Dashboard Screen(Subaccount) */
const memberOverview = async (req, res) => {
  try {
    // Define a "day" from 07:00:00 of one calendar date to 06:59:59.999 of the next.
    const now = new Date();
    const customStartHour = 7;

    const dayStart = new Date(now);
    if (now.getHours() >= customStartHour) {
      // Same calendar day, starting at 07:00
      dayStart.setHours(customStartHour, 0, 0, 0);
    } else {
      // Before 07:00, treat it as the previous "day"
      dayStart.setDate(dayStart.getDate() - 1);
      dayStart.setHours(customStartHour, 0, 0, 0);
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setMilliseconds(dayEnd.getMilliseconds() - 1);

    const [totalMembers, registeredToday] = await Promise.all([
      User.count({
        include: [
          {
            model: Role,
            as: "role",
            where: { name: "member" },
          },
        ],
      }),
      User.count({
        where: {
          createdAt: {
            [Op.between]: [dayStart, dayEnd],
          },
        },
        include: [
          {
            model: Role,
            as: "role",
            where: { name: "member" },
          },
        ],
      }),
    ]);
    const memberOverviewsArray = [
      {
        total_member: totalMembers,
        register_today: registeredToday,
      },
    ];
    response(res, 200, true, "Member Overviews fetch Successfully.", {
      memberOverviews: memberOverviewsArray,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getAnnounces,
  operateAnnounces,
  memberOverview,
};
