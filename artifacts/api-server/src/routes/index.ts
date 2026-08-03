import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import accountsRouter from "./accounts";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import currenciesRouter from "./currencies";
import budgetsRouter from "./budgets";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import subscriptionsRouter from "./subscriptions";
import paymentsRouter from "./payments";
import notificationsRouter from "./notifications";
import settingsRouter from "./settings";
import backupsRouter from "./backups";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/accounts", accountsRouter);
router.use("/transactions", transactionsRouter);
router.use("/categories", categoriesRouter);
router.use("/currencies", currenciesRouter);
router.use("/budgets", budgetsRouter);
router.use("/reports", reportsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/payments", paymentsRouter);
router.use("/notifications", notificationsRouter);
router.use("/settings", settingsRouter);
router.use("/backups", backupsRouter);
router.use("/admin", adminRouter);

export default router;
