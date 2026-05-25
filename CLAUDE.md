# Backend - Temur PUBGM (server/)

Node.js + Express + MongoDB (Mongoose) + Agenda + JWT (access + refresh).

## Domen va rollar

**Temur PUBGM** - PUBG Mobile turnirlari platformasi. Backend asosiy entitylari (kelajakda qo'shiladi):

- `Tournament` - turnir (sana, format, prize, slotlar, room ID).
- `Team` - komanda (leader, members[], tournament refs).
- `User` - barcha rollar uchun ([[telegram_id]], game nickname, game ID maydonlari player'lar uchun qo'shiladi).

**Rollar:** `owner` (static, super-admin) + `admin` (turnir tashkilotchi) + `leader` (komanda kapitani) + `player` (ishtirokchi). `admin`/`leader`/`player` - DB `Role` collection orqali, seed orqali yaratiladi.

**Permission keylari domen tilida**: `tournaments.create`, `tournaments.update`, `teams.read`, `players.update` va h.k. Yangi modul qo'shganda - generik `users.*` emas, domen so'zi ishlatilsin.

**Player flow asosan bot orqali** (`bot/` papkasi). Server REST API bot va frontend ikkalasiga ham xizmat qiladi; bot uchun maxsus endpointlar (`/api/bot/...`) ham bo'lishi mumkin (Telegram ID orqali auth).

## Folder structure

```
server/src/
├─ index.js                       # entrypoint: connect -> agenda -> listen
├─ app.js                         # Express app + middleware + routes
├─ config/
│  ├─ env.js                      # process.env validation
│  ├─ db.js                       # mongoose.connect
│  ├─ logger.js                   # pino logger
│  └─ agenda.js                   # Agenda instance
├─ middleware/
│  ├─ asyncHandler.js
│  ├─ errorHandler.js
│  ├─ notFound.js
│  ├─ auth.js                     # requireAuth (JWT verify)
│  ├─ requireRole.js
│  ├─ requirePermission.js
│  ├─ rateLimiter.js
│  └─ validate.js                 # zod schema -> middleware
├─ utils/
│  ├─ ApiError.js
│  ├─ ApiResponse.js
│  ├─ pagination.js
│  └─ jwt.js                      # signAccess, signRefresh, verify*
├─ helpers/
│  ├─ cookie.helper.js
│  ├─ password.helper.js
│  └─ permission.helper.js
├─ models/
│  ├─ user.model.js
│  ├─ role.model.js
│  ├─ permission.model.js
│  └─ refreshToken.model.js
├─ modules/                       # feature-based segmentation
│  └─ <name>/
│     ├─ handlers/                # one file per endpoint
│     │  ├─ list.handler.js
│     │  ├─ getById.handler.js
│     │  ├─ create.handler.js
│     │  ├─ update.handler.js
│     │  └─ remove.handler.js
│     ├─ services/<name>.service.js
│     ├─ validators/              # zod schemas
│     └─ <name>.routes.js         # router assembly
├─ jobs/
│  ├─ index.js                    # define + start
│  └─ <name>.job.js
└─ routes/index.js                # mounts all modules under /api
```

## Module creation rules

Every endpoint lives in its own file (`handlers/<action>.handler.js`):

```js
// modules/users/handlers/create.handler.js
import asyncHandler from "@/middleware/asyncHandler.js";
import * as usersService from "../services/users.service.js";

const create = asyncHandler(async (req, res) => {
  const data = await usersService.create(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export default create;
```

The service handles business logic and **may access the DB directly**:

```js
// modules/users/services/users.service.js
import User from "@/models/user.model.js";
import ApiError from "@/utils/ApiError.js";

export const create = async (body, currentUser) => {
  const exists = await User.findOne({ phone: body.phone });
  if (exists) throw new ApiError(409, "Bunday foydalanuvchi mavjud");
  return User.create({ ...body });
};
```

The router only wires up the methods:

```js
// modules/users/users.routes.js
import { Router } from "express";
import requireAuth from "@/middleware/auth.js";
import requirePermission from "@/middleware/requirePermission.js";
import validate from "@/middleware/validate.js";
import create from "./handlers/create.handler.js";
import { createSchema } from "./validators/create.validator.js";

const router = Router();
router.post("/", requireAuth, requirePermission("users.create"), validate(createSchema), create);
export default router;
```

## Response shape

Success:
```json
{ "success": true, "data": {...}, "message": "...", "meta": { "page": 1, "limit": 20, "total": 100 } }
```

Error (emitted by the central `errorHandler`):
```json
{ "success": false, "message": "...", "code": "ERR_CODE", "details": [...] }
```

## Auth flow

- `POST /api/auth/login` - `{ login, password }` -> `accessToken` + refresh httpOnly cookie.
- `POST /api/auth/refresh` - refresh cookie -> new access + a rotated new refresh.
- `POST /api/auth/logout` - refresh is removed from the DB + the cookie is cleared.
- `GET /api/auth/me` - protected by `requireAuth`, returns `{ user, role, permissions }`.

## Role and permission

- `User.role: string` - `"owner"` is the only hard-coded value. Other roles (`admin`, `leader`, `player`) must exist in the `Role` collection.
- Owner - always has every permission (hard rule in the code base).
- `Role` collection: `{ value, label, permissions: ObjectId[] }`.
- `Permission` collection: `{ key, label, group }`. Keylar **domen tilida** (`tournaments.create`, `teams.update`, ...).
- Permissions are attached to a role via `Role.permissions: ObjectId[]`.
- Middleware: `requireAuth -> (requireRole("admin") | requirePermission("tournaments.read"))`.

## Agenda

- `config/agenda.js` - instance.
- `jobs/index.js` - `agenda.define("job-name", handler)` + `await agenda.start()`.
- Graceful shutdown: in `app.js`, on SIGTERM/SIGINT call `await agenda.stop()`.

## Commands

```bash
npm run dev      # nodemon
npm start        # production
npm run lint
```

## Language rules

- Code and technical values - English.
- The `message` returned to the user - Uzbek (`"Tizimga xush kelibsiz"`, `"Login yoki parol noto'g'ri"`).
