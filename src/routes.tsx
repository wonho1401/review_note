import { createBrowserRouter } from "react-router";
import HomePage from "@/pages/HomePage";
import ArchiveDetailPage from "@/pages/ArchiveDetailPage";
import QuestionEditPage from "@/pages/QuestionEditPage";
import SolveSessionPage from "@/pages/SolveSessionPage";
import NotFoundPage from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/archives/:archiveId", element: <ArchiveDetailPage /> },
  { path: "/archives/:archiveId/questions/new", element: <QuestionEditPage /> },
  {
    path: "/archives/:archiveId/questions/:questionId/edit",
    element: <QuestionEditPage />,
  },
  { path: "/archives/:archiveId/solve", element: <SolveSessionPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
