import { Router } from "express";
import { gameManagementRouter } from "../modules/game-management/game.routes.js";
import { liveStreamingPaymentBettingRouter } from "../modules/live-streaming-payment-betting/live.routes.js";
import { monitoringReportingRouter } from "../modules/monitoring-reporting/monitoring.routes.js";
import { sessionAdministrationRouter } from "../modules/session-administration/session.routes.js";

export const apiRouter = Router();

apiRouter.use(gameManagementRouter);
apiRouter.use(sessionAdministrationRouter);
apiRouter.use(liveStreamingPaymentBettingRouter);
apiRouter.use(monitoringReportingRouter);