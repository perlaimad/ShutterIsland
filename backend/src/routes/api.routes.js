import { Router } from "express";
import { gameManagementRouter } from "../modules/GameManagement/game.routes.js";
import { liveStreamingPaymentBettingRouter } from "../modules/LiveStreamingPaymentBetting/live.routes.js";
import { monitoringReportingRouter } from "../modules/MonitoringReporting/monitoring.routes.js";
import { sessionAdministrationRouter } from "../modules/SessionAdminstration/session.routes.js";

export const apiRouter = Router();

apiRouter.use(gameManagementRouter);
apiRouter.use(sessionAdministrationRouter);
apiRouter.use(liveStreamingPaymentBettingRouter);
apiRouter.use(monitoringReportingRouter);
