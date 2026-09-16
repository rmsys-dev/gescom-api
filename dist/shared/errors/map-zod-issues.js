export const mapZodIssuePath = (issue, segment) => {
    if (segment) {
        if (!issue.path.length) {
            return segment;
        }
        return `${segment}.${issue.path.join(".")}`;
    }
    if (!issue.path.length) {
        return "request";
    }
    return issue.path.join(".");
};
export const mapZodIssuesToDetails = (issues, segment) => issues.map((issue) => ({
    path: mapZodIssuePath(issue, segment),
    message: issue.message,
}));
