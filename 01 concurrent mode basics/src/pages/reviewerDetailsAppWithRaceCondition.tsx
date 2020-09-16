import * as React from "react";
import { fetchReviewer, fetchCommentsForReviewer } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";

// Types
interface ReviewerPageProps {
  id: number;
}

interface ReviewerProps {
  id: number;
}

interface CommentsProps {
  id: number;
}

// App
const getNextId = (id: number) => {
  switch(id) {
    case 3:
      return 5;
    case 5: 
      return 7;
    default:
      return 3;
  }
};

export const ReviewerDetailsApp = () => {
  const [id, setId] = React.useState(3);

  return (
    <>
      <button
        onClick={() => {
          const nextUserId = getNextId(id);
          setId(nextUserId);
        }}
      >
        Next
      </button>
      <ReviewerPage id={id} />
    </>
  );
};

// Subpages and components
const ReviewerPage = (props: ReviewerPageProps) => {
  const { id } = props;

  return (
    <>
      <PullRequestReviewer id={id} />
      <PullRequestComments id={id} />
    </>
  );
}

const PullRequestComments = (props: CommentsProps) => { 
  const [comments, setComments] = React.useState<CommentsVM[]>(null);
  React.useEffect(() => {
    fetchCommentsForReviewer(props.id).then(comments => setComments(comments));
  }, [props.id]);

  if (comments === null) {
    return <h2>Loading comments...</h2>;
  }
  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}

const PullRequestReviewer = (props: ReviewerProps) => {
  const [reviewer, setReviewer] = React.useState<ReviewerVM>(null);
  React.useEffect(() => {
    fetchReviewer(props.id).then(reviewer => setReviewer(reviewer));
  }, [props.id]);

  if (reviewer === null) {
    return <p>Loading reviewer...</p>;
  }
  return <h1>{`Reviewer: ${reviewer.name}`}</h1>;
};
