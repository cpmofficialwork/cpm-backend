const User = require('../models/user.model');

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IST_TIMEZONE = 'Asia/Kolkata';

// "Today"/"this week" are India-local calendar days for this user base, computed
// from the IST offset directly rather than the host's OS timezone — the server
// may run in UTC in production, but signups should still bucket by IST date.
const startOfISTDay = (date) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
};

const toISTDateKey = (date) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

// Zero-fills days with no signups so the graph has a fixed 7-point x-axis
// instead of gaps wherever the aggregate found nothing to group.
const fillLast7Days = (startOfToday, counts) => {
  const countByDate = new Map(counts.map((c) => [c._id, c.count]));
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = toISTDateKey(new Date(startOfToday.getTime() - i * DAY_MS));
    days.push({ date, count: countByDate.get(date) || 0 });
  }
  return days;
};

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = startOfISTDay(now);
    const startOfWeek = new Date(startOfToday.getTime() - 6 * DAY_MS);
    const istNow = new Date(now.getTime() + IST_OFFSET_MS);
    const startOfMonth = new Date(
      Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1) - IST_OFFSET_MS
    );

    const [
      totalUsers,
      todayNewUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      last7DaysRaw,
      byDistrictRaw,
      byStateRaw,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.aggregate([
        { $match: { createdAt: { $gte: startOfWeek } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST_TIMEZONE },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      totalUsers,
      todayNewUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      last7Days: fillLast7Days(startOfToday, last7DaysRaw),
      byDistrict: byDistrictRaw.map((d) => ({ district: d._id, count: d.count })),
      byState: byStateRaw.map((d) => ({ state: d._id, count: d.count })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
