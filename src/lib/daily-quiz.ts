import { QUIZ } from "virtual:lab-quiz";
import { pickDailyQuestions, questionPool } from "./daily-questions";

// Only the Daily page loads this: the Check questions of every lab, without the rest of a lesson.
const POOL = questionPool(QUIZ);

export const dailyQuestions = (day?: string) => pickDailyQuestions(POOL, day);
