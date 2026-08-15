"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAV_ICONS = void 0;
const lucide_react_1 = require("lucide-react");
// Kept as a name->component registry rather than putting `LucideIcon` values directly in
// nav-config.ts, so nav-config stays a plain serialisable data module that server
// components (the team permissions page) can import without dragging in icon components.
exports.NAV_ICONS = {
    activity: lucide_react_1.Activity,
    archive: lucide_react_1.Archive,
    award: lucide_react_1.Award,
    barChart: lucide_react_1.BarChart3,
    briefcase: lucide_react_1.Briefcase,
    calendar: lucide_react_1.Calendar,
    contact: lucide_react_1.Contact,
    fileClock: lucide_react_1.FileClock,
    fileStack: lucide_react_1.FileStack,
    globe: lucide_react_1.Globe,
    heart: lucide_react_1.Heart,
    heartHandshake: lucide_react_1.HeartHandshake,
    heartPulse: lucide_react_1.HeartPulse,
    history: lucide_react_1.History,
    images: lucide_react_1.Images,
    inbox: lucide_react_1.Inbox,
    landmark: lucide_react_1.Landmark,
    layoutDashboard: lucide_react_1.LayoutDashboard,
    layoutTemplate: lucide_react_1.LayoutTemplate,
    lightbulb: lucide_react_1.Lightbulb,
    link: lucide_react_1.Link2,
    listChecks: lucide_react_1.ListChecks,
    mail: lucide_react_1.Mail,
    megaphone: lucide_react_1.Megaphone,
    messageCircle: lucide_react_1.MessageCircle,
    messageSquare: lucide_react_1.MessageSquare,
    penLine: lucide_react_1.PenLine,
    plug: lucide_react_1.Plug,
    radar: lucide_react_1.Radar,
    repeat: lucide_react_1.Repeat,
    scrollText: lucide_react_1.ScrollText,
    send: lucide_react_1.Send,
    server: lucide_react_1.Server,
    settings: lucide_react_1.Settings,
    target: lucide_react_1.Target,
    ticket: lucide_react_1.Ticket,
    trendingUp: lucide_react_1.TrendingUp,
    userCog: lucide_react_1.UserCog,
    users: lucide_react_1.Users,
    webhook: lucide_react_1.Webhook,
};
