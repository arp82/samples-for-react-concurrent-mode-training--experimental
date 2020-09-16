import { wrapPromise } from "./wrapPromise";

interface CodeReviewer {
  name: string;
  id: number;
}

const BE_REVIEWERS = [
  { name: "Marioli", id: 3 },
  { name: "Carlos", id: 5 },
  { name: "Lucia", id: 7 },
];

const BE_COMMENTS = [
  { id: 0, reviewerId: 3, text: "I do not like this true here, I will create a constant with a meaning name" },
  { id: 1, reviewerId: 3, text: "From my point of view make the code less readable" },
  { id: 2, reviewerId: 3, text: "What does it do?" },
  { id: 3, reviewerId: 5, text: "Please, refactor to functional component" },
  { id: 4, reviewerId: 5, text: "The trees do not let you see the forest" },
  { id: 5, reviewerId: 7, text: "No comments" },
];

export const fetchCodeReviewData = () => {
  const codeReviewersPromise = fetchCodeReviewers();
  const commentsPromise = fetchComments();
  return {
    reviewers: wrapPromise<CodeReviewer[]>(codeReviewersPromise),
    comments: wrapPromise<CodeReviewComment[]>(commentsPromise),
  }
};

export const fetchCodeReviewers = () => {
  console.log("fetching code reviewer...");
  return new Promise<CodeReviewer[]>(resolve => {
    setTimeout(() => {
      console.log("fetched reviewers");
      resolve(BE_REVIEWERS);
    }, 1000);
  });
};

interface CodeReviewComment {
  id: number,
  text: string,
  reviewerId: number,
}

export const fetchComments = () => {
  console.log("fetching comments...");
  return new Promise<CodeReviewComment[]>(resolve => {
    setTimeout(() => {
      console.log("fetched comments");
      resolve(BE_COMMENTS);
    }, 2000);
  });
};

export const fetchReviewer = (id: number) => {
  console.log("fetching code reviewer...", id);
  return new Promise<CodeReviewer>(resolve => {
    setTimeout(() => {
      console.log("fetched reviewer", id);
      resolve(BE_REVIEWERS.find(reviewer => reviewer.id === id));
    }, 1000);
  });
};

export const fetchCommentsForReviewer = (id: number) => {
  console.log("fetching comments...", id);
  return new Promise<CodeReviewComment[]>(resolve => {
    setTimeout(() => {
      console.log("fetched comments", id);
      resolve(BE_COMMENTS.filter(comment => comment.reviewerId === id));
    }, 2000);
  });
};

export const fetchCodeReviewerData = (id: number) => {
  const codeReviewerPromise = fetchReviewer(id);
  const commentsForReviewerPromise = fetchCommentsForReviewer(id);
  return {
    id,
    reviewer: wrapPromise<CodeReviewer>(codeReviewerPromise),
    comments: wrapPromise<CodeReviewComment[]>(commentsForReviewerPromise),
  }
};
