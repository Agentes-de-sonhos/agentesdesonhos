import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import type { QuizQuestion, TrailExamQuestion } from "@/types/academy";

interface QuizPlayerProps {
  questions: (QuizQuestion | TrailExamQuestion)[];
  onSubmit: (answers: Record<string, string>, score: number, passed: boolean) => void;
  passingScore?: number; // 100 for module quiz, 75 for final exam
  title?: string;
}

export function QuizPlayer({ questions, onSubmit, passingScore = 100, title = "Quiz" }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleFinish = () => {
    let correct = 0;
    questions.forEach((q) => {
      const selectedOptionId = answers[q.id];
      const correctOption = q.options?.find((o) => o.is_correct);
      if (selectedOptionId && correctOption && selectedOptionId === correctOption.id) {
        correct++;
      }
    });
    const finalScore = Math.round((correct / totalQuestions) * 100);
    const passed = finalScore >= passingScore;
    setScore(finalScore);
    setShowResults(true);
    onSubmit(answers, finalScore, passed);
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setScore(0);
  };

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma pergunta cadastrada para este quiz.
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const passed = score >= passingScore;
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          {passed ? (
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          ) : (
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
          )}
          <h3 className="text-2xl font-bold">
            {passed ? "Aprovado! 🎉" : "Não aprovado"}
          </h3>
          <p className="text-lg">
            Sua nota: <span className="font-bold text-primary">{score}%</span>
          </p>
          <p className="text-muted-foreground">
            {passed
              ? "Parabéns! Você pode avançar para o próximo módulo."
              : `Você precisa de ${passingScore}% para ser aprovado. Tente novamente!`}
          </p>
          {!passed && (
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{title}</h3>
        <Badge variant="outline">
          {currentIndex + 1} / {totalQuestions}
        </Badge>
      </div>

      <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-2" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {currentQuestion.question_text}
          </CardTitle>
          <Badge variant="secondary" className="w-fit">
            {currentQuestion.question_type === "true_false"
              ? "Verdadeiro ou Falso"
              : currentQuestion.question_type === "multiple_choice"
              ? "Múltipla Escolha"
              : "Alternativa Única"}
          </Badge>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
          >
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.option_text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          Anterior
        </Button>

        {currentIndex < totalQuestions - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
          >
            Próxima
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={Object.keys(answers).length < totalQuestions}
          >
            Finalizar Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
