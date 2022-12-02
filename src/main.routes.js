const companyRouter = require("./Routes/company.route");
const driverRouter = require("./Routes/driver.route");
const eldRouter = require("./Routes/eld.route");
const hosMasterRouter = require("./Routes/hosMaster.route");
const IFTARecords = require("./Routes/IFTARecords.route");
const portalUserRouter = require("./Routes/portalUser.route");
const userRouter = require("./Routes/user.route");
const vehicleRouter = require("./Routes/vehicle.route");
const fmcsaRouter = require("./Routes/fmcsa.route");
const eldEventsRouter = require("./Routes/eldEvents.route");
const assetsRouter = require("./Routes/assets.route");
const dashboardRouter = require("./Routes/dashboard.route");
const billingRouter = require("./Routes/billing.route");
const driverHosRouter = require("./Routes/driverHos.route");
const logsRouter = require("./Routes/logs.route");
const outputCSVRouter = require("./Routes/outputCSV.route");
const resourcesRouter = require("./Routes/resources.route");
const chatRouter = require("./Routes/chat.route");
const initRoutes = (app) => {
  app.use(`/user`, userRouter());
  app.use(`/company`, companyRouter());
  app.use(`/driver`, driverRouter());
  app.use(`/portalUser`, portalUserRouter());
  app.use(`/hosMaster`, hosMasterRouter());
  app.use(`/vehicle`, vehicleRouter());
  app.use(`/eld`, eldRouter());
  app.use(`/ifta`, IFTARecords());
  app.use(`/fmcsa`, fmcsaRouter());
  app.use(`/eldEvents`, eldEventsRouter());
  app.use(`/assets`, assetsRouter());
  app.use(`/dashboard`, dashboardRouter());
  app.use(`/billing`, billingRouter());
  app.use(`/driver-hos`, driverHosRouter());
  app.use(`/logs`, logsRouter());
  app.use(`/output-csv`, outputCSVRouter());
  app.use(`/resources`, resourcesRouter());
  app.use(`/chat`, chatRouter());
};

module.exports = initRoutes;