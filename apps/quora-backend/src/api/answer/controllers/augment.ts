interface homeQuestion {
  id?: string | number;
  topAnswer?: {
    id?: string | number;
    documentId?: string;
    upvoteCount?: number;
    commentCount?: number;
  };
}

export default {
  async home(ctx, _next) {
    const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {};

    const knex = strapi.db.connection;

    const offset = (page - 1) * pageSize || 0;

    // Answers

    const answeredQs = await strapi
      .documents("api::question.question")
      .findMany({
        filters: {
          $or: [
            {
              answers: {
                $and: [
                  {
                    id: {
                      $notNull: true,
                    },
                  },
                ],
              },
            },
            {
              bot_answer: {
                id: {
                  $notNull: true,
                },
              },
              answers: {
                $and: [
                  {
                    id: {
                      $null: true,
                    },
                  },
                ],
              },
            },
          ],
        },
        populate: {
          bot_answer: {},
          answers: {
            fields: ["id"],
          },
        },
        fields: ["id", "title"],
        limit: pageSize,
        start: offset,
      });

    const qIds = answeredQs.filter((q) => !!q["answers"]).map((q) => q.id);

    const upvoteCounts = await knex("questions as q")
      .whereIn("q.id", qIds)
      .leftJoin("answers_question_lnk as aql", "q.id", "aql.question_id")
      .whereNotNull("aql.answer_id")
      .leftJoin("answers as a", "aql.answer_id", "a.id")
      .leftJoin("votes_answer_lnk as val", "a.id", "val.answer_id")
      .leftJoin("votes as v", "val.vote_id", "v.id")
      .select(
        "q.id as question_id",
        "a.id as answer_id",
        "a.document_id as answer_document_id",
        knex.raw(
          "SUM(CASE WHEN v.type = ? THEN 1 ELSE 0 END) as upvote_count",
          ["upvote"],
        ),
      )
      .groupBy("q.id", "a.id");

    const questionsWithAnswers = {};

    upvoteCounts.forEach((row) => {
      const questionId = row.question_id;

      if (!questionsWithAnswers[questionId]) {
        questionsWithAnswers[questionId] = {
          id: questionId,
          topAnswer: {
            id: row.answer_id,
            upvoteCount: row.upvote_count,
            documentId: row.answer_document_id,
          },
        };
      } else if (
        row.upvote_count >
        questionsWithAnswers[questionId].topAnswer.upvoteCount
      ) {
        questionsWithAnswers[questionId].topAnswer = {
          id: row.answer_id,
          upvoteCount: row.upvote_count,
          documentId: row.answer_document_id,
        };
      }
    });

    const topAnswers = Object.values(questionsWithAnswers).map(
      (q: homeQuestion) => {
        return q.topAnswer;
      },
    );

    let answers = await strapi.documents("api::answer.answer").findMany({
      filters: {
        id: {
          $in: topAnswers.map((ta) => ta.id),
        },
      },
      populate: ["answerer", "question"],
    });

    const commentCounts = await knex("answers as a")
      .whereIn(
        "a.id",
        answers.map((a) => a.id),
      )
      .leftJoin("comments_answer_lnk as cal", "a.id", "cal.answer_id")
      .leftJoin("comments as c", "cal.comment_id", "c.id")
      .select(
        "a.id as answer_id",
        "a.document_id as answer_document_id",
        knex.raw("COUNT(c.id) as comment_count"),
      )
      .groupBy("a.id");

    answers = answers.map((ans) => {
      const tempAnsw = topAnswers.find((a) => a.documentId == ans.documentId);
      ans["upvoteCount"] = tempAnsw?.upvoteCount || 0;

      const tempCC = commentCounts.find(
        (cc) => cc.answer_document_id == ans.documentId,
      );
      ans["commentCount"] = tempCC?.comment_count || 0;
      return ans;
    });

    // Bot Answers

    const botOnlyAnsweredQuestions = answeredQs.filter(
      (q) => !!q["bot_answer"] && !!!q["answers"].length,
    );

    const baqIds = botOnlyAnsweredQuestions.map((q) => q.id);

    let botAnswers = botOnlyAnsweredQuestions.map((baq) => {
      const tempBA = baq["bot_answer"];
      delete baq["bot_answer"];
      tempBA["question"] = baq;

      return tempBA;
    });

    const baIds = botAnswers.map((ba) => ba.id);

    const baUpvotes = await knex("questions as q")
      .whereIn("q.id", baqIds)
      .leftJoin("questions_bot_answer_lnk as qbal", "q.id", "qbal.question_id")
      .whereNotNull("qbal.bot_answer_id")
      .leftJoin("bot_answers as ba", "qbal.bot_answer_id", "ba.id")
      .leftJoin("votes_bot_answer_lnk as vbal", "ba.id", "vbal.bot_answer_id")
      .leftJoin("votes as v", "vbal.vote_id", "v.id")
      .select(
        "ba.id as bot_answer_id",
        knex.raw(
          "SUM(CASE WHEN v.type = ? THEN 1 ELSE 0 END) as upvote_count",
          ["upvote"],
        ),
      )
      .groupBy("q.id", "ba.id");

    const baCommentCounts = await knex("bot_answers as ba")
      .whereIn("ba.id", baIds)
      .leftJoin(
        "comments_bot_answer_lnk as cbal",
        "ba.id",
        "cbal.bot_answer_id",
      )
      .leftJoin("comments as c", "cbal.comment_id", "c.id")
      .select(
        "ba.id as bot_answer_id",
        knex.raw("COUNT(c.id) as comment_count"),
      )
      .groupBy("ba.id");

    botAnswers = botAnswers.map((ba) => {
      const tempUC = baUpvotes.find((bauc) => bauc.bot_answer_id === ba.id);
      ba["upvoteCount"] = tempUC?.upvote_count || 0;

      const tempCC = baCommentCounts.find((cc) => cc.bot_answer_id === ba.id);
      ba["commentCount"] = tempCC?.comment_count || 0;

      return ba;
    });

    ctx.body = [...answers, ...botAnswers];
  },
  async homeCount(ctx, _next) {
    const answeredQuestionCount = await strapi
      .documents("api::question.question")
      .count({
        filters: {
          $or: [
            {
              answers: {
                $and: [
                  {
                    id: {
                      $notNull: true,
                    },
                  },
                ],
              },
            },
            {
              bot_answer: {
                id: {
                  $notNull: true,
                },
              },
              answers: {
                $and: [
                  {
                    id: {
                      $null: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      });

    ctx.body = { count: answeredQuestionCount };
  },
  async comments(ctx, _next) {
    const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {};

    const id = ctx.params?.id || "";

    let comments = await strapi.documents("api::comment.comment").findMany({
      filters: {
        answer: {
          id: { $eq: id },
        },
      },
      sort: "createdAt:desc",
      populate: ["commenter"],
      start: (page - 1) * pageSize || 0,
      limit: pageSize || 25,
    });

    const knex = strapi.db.connection;

    const upvoteCounts = await knex("comments as c")
      .leftJoin("votes_comment_lnk as vcl", "c.id", "vcl.comment_id")
      .leftJoin("votes as v", "vcl.vote_id", "v.id")
      .whereIn(
        "c.id",
        comments.map((c) => c.id),
      )
      .select(
        "c.id as comment_id",
        "c.document_id as comment_document_id",
        knex.raw(
          "SUM(CASE WHEN v.type = ? THEN 1 ELSE 0 END) as upvote_count",
          ["upvote"],
        ),
      )
      .groupBy("c.id");

    comments = comments.map((comment) => {
      const tempUVC = upvoteCounts.find((uvc) => uvc.comment_id == comment.id);
      comment["upvoteCount"] = tempUVC?.upvote_count || 0;

      return comment;
    });

    ctx.body = comments;
  },
  async commentCount(ctx, _next) {
    const id = ctx.params?.id || "";

    let commentCount = await strapi.documents("api::comment.comment").count({
      filters: {
        answer: {
          id: { $eq: id },
        },
      },
    });

    ctx.body = { count: commentCount };
  },
};