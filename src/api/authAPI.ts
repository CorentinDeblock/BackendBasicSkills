import passport from "passport";
import express from "express";
import { Strategy as LocalStrategy } from "passport-local";
import { PrismaClient, User } from "@prisma/client";

const route = express.Router();

route.use(passport.initialize());
route.use(passport.session());

passport.use(
    new LocalStrategy(async (email, password, done) => {
        const prisma = new PrismaClient();

        const user = await prisma.user.findUnique({
            where: {
                email,
                password,
            },
        });

        if (user === null) {
            return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user, { message: "Logged in" });
    })
);

passport.serializeUser((user, done) => {
    done(null, (user as User).id);
});

passport.deserializeUser(async (id, done) => {
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
        where: { id: id as string },
    });

    done(null, user);
});

route.post("/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json({ message: "Success" });
});

route.post("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: "Error logging out" });
        }
        res.json({ message: "Logged out successfully" });
    });
});

function isAuthenticated(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
}

export { route, isAuthenticated };
