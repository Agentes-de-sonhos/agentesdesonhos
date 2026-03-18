-- Allow admins to delete any question
CREATE POLICY "Admins can delete any question"
ON public.qa_questions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any answer
CREATE POLICY "Admins can delete any answer"
ON public.qa_answers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any answer likes (cascade cleanup)
CREATE POLICY "Admins can delete any answer like"
ON public.qa_answer_likes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));