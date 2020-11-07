import { Request, Response } from "express";
import Question from "../../models/Questions";
import Quiz, { IQuizDoc } from "../../models/Quizzes";
import User from "../../models/Users";
import Excel from "exceljs";
import Circle from "../../models/Circles";

export const addQuiz = (req: Request, res: Response) => {
  const { name, startDate, endDate } = req.body;
  new Quiz({ name, startDate, endDate }).save().then(() =>
    res.json({
      isFailed: false,
      errors: {},
      data: { success: "Add quiz successfully" },
    })
  );
};

export const getQuizzes = (req: Request, res: Response) => {
  let data: {
    upcomingQuizzes: IQuizDoc[] | [];
    currentQuiz: IQuizDoc | null;
    previousQuizzes: IQuizDoc[] | [];
  } = {
    upcomingQuizzes: [],
    currentQuiz: null,
    previousQuizzes: [],
  };

  Quiz.find({ startDate: { $gt: new Date() } })
    .then((upcomingQuizzes) => {
      data.upcomingQuizzes = upcomingQuizzes;
      return Quiz.findOne({
        startDate: { $lt: new Date() },
        endDate: { $gt: new Date() },
      });
    })
    .then((currentQuiz) => {
      data.currentQuiz = currentQuiz;
      return Quiz.find({ endDate: { $lt: new Date() } });
    })
    .then((previousQuizzes) => {
      data.previousQuizzes = previousQuizzes;
      return res.json({
        isFailed: false,
        errors: {},
        data,
      });
    });
};

export const deleteQuiz = (req: Request, res: Response) => {
  const quizId = req.query.quizId as string;

  Quiz.findByIdAndDelete(quizId)
    .then(() => Question.deleteMany({ quizId }))
    .then(() =>
      User.updateMany(
        { "solvedQuestions.quizId": quizId },
        { $pull: { solvedQuestions: { quizId: quizId } } }
      )
    )
    .then(() =>
      res.json({
        isFailed: false,
        errors: {},
        data: { success: "Quiz removed successfully" },
      })
    )
    .catch((err) => console.log(err));
};

export const getStandings = (req: Request, res: Response) => {
  const quizId = req.query.quizId as string;

  User.find(
    { "solvedQuestions.quizId": quizId },
    "name email solvedQuestions lastUpdate"
  ).then((doc) => {
    return res.json({
      isFailed: false,
      errors: {},
      data: { responses: doc },
    });
  });
};

export const downloadResponses = (req: Request, res: Response) => {
  const quizId = req.query.quizId as string;
  const wb = new Excel.Workbook();
  let circles: { name: string; _id: string }[] = [];
  let questions: {
    question: string;
    circleId: string;
    index: number;
    _id: string;
  }[] = [];

  Quiz.findById(quizId).then((doc) => {
    if (!doc) {
      return res.json({
        isFailed: true,
        error: { quiz: "No quiz with this id" },
        data: {},
      });
    }

    let column = 3,
      secondRow = ["", ""];
    const sheet = wb.addWorksheet(doc.name, {
      pageSetup: { horizontalCentered: true },
    });
    sheet.views = [
      {
        state: "frozen",
        ySplit: 2,
      },
    ];

    sheet.getCell(1, 1).value = "Name";
    sheet.getCell(1, 2).value = "Email";

    Question.find({ quizId }, "question circleId index")
      .then((doc) => {
        questions = doc;
        let circlesIds = new Set();
        questions.forEach((qu) => circlesIds.add(qu.circleId));
        return Circle.find({ _id: { $in: Array.from(circlesIds) } }, "name");
      })
      .then((doc) => {
        circles = [...doc];

        circles.forEach((circle) => {
          const circleQuestions = questions.filter(
            (qu) => qu.circleId.toString() == circle._id.toString()
          );
          circleQuestions.forEach((qu, i) => {
            sheet.getColumn(column + i).key = qu._id.toString();
            secondRow.push(qu.question);
          });
          sheet.mergeCells(1, column, 1, circleQuestions.length + column - 1);
          sheet.getCell(1, column).value = circle.name;
          column += circleQuestions.length;
        });
        sheet.getCell(1, column).value = "Lastupdate";
        sheet.addRow(secondRow);

        // Add styles
        sheet.getRows(1, 2).forEach((row) => {
          row.font = {
            color: { argb: "00FFFFFF" },
            size: 12,
            bold: true,
          };
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC0504D" },
          };
        });

        return User.find(
          { "solvedQuestions.quizId": quizId },
          "name email solvedQuestions lastUpate"
        ).then((doc) => {
          doc.forEach((user) => {
            let row = [user.name, user.email];
            user.solvedQuestions.forEach((qu) => {
              const column = sheet.getColumn(qu.questionId.toString())?.number;
              row[column] = qu.answer;
            });
            row[3 + circles.length] = user.lastUpate?.toString() || "";

            sheet.addRow(row);
          });
        });
      })
      .then(() => {
        res.attachment("file.xlsx");
        return wb.xlsx.write(res);
      })
      .then(() => res.end());
  });
};
