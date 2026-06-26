import moment from "moment";

export function getCurrentAccountingYear() {
    const today = moment();
    const fyStart =
        today.month() >= 3
            ? moment([today.year(), 3, 1])
            : moment([today.year() - 1, 3, 1]);
    const fyEnd = fyStart.clone().add(1, "year").subtract(1, "day");

    return {
        date_from: fyStart.format("YYYY-MM-DD"),
        date_to: fyEnd.format("YYYY-MM-DD"),
    };
}

export default function DatePeriods() {
    const today = moment();
    const { date_from, date_to } = getCurrentAccountingYear();

    return {
        Today: {
            date_from: today.format("YYYY-MM-DD"),
            date_to: today.format("YYYY-MM-DD"),
        },

        "Last Week": {
            date_from: today.clone().subtract(1, "week").startOf("isoWeek").format("YYYY-MM-DD"),
            date_to: today.clone().subtract(1, "week").endOf("isoWeek").format("YYYY-MM-DD"),
        },

        "This Week": {
            date_from: today.clone().startOf("isoWeek").format("YYYY-MM-DD"),
            date_to: today.clone().endOf("isoWeek").format("YYYY-MM-DD"),
        },

        "Current Month": {
            date_from: today.clone().startOf("month").format("YYYY-MM-DD"),
            date_to: today.clone().endOf("month").format("YYYY-MM-DD"),
        },

        "Previous Month": {
            date_from: today.clone().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
            date_to: today.clone().subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
        },

        "Current FY": {
            date_from,
            date_to,
        },
    };
}