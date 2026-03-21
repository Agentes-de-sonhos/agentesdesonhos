import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, MapPin, Calendar, Building, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FamTrip, InPersonEvent } from "@/types/community";

interface CommunityFeedSectionProps {
  famTrips?: FamTrip[];
  events?: InPersonEvent[];
}

export function CommunityFeedSection({ famTrips = [], events = [] }: CommunityFeedSectionProps) {
  const {
    posts,
    loadingPosts,
    createPost,
    isCreating,
    toggleLike,
    deletePost,
    fetchComments,
    addComment,
    isAddingComment,
    deleteComment,
  } = useCommunityFeed();

  // Build feed items: posts interspersed with content blocks
  const feedItems: { type: string; data: any; key: string }[] = [];

  posts.forEach((post, i) => {
    feedItems.push({ type: "post", data: post, key: post.id });

    // After 2nd post, inject fam trips if available
    if (i === 1 && famTrips.length > 0) {
      feedItems.push({ type: "famtrips", data: famTrips.slice(0, 2), key: "famtrips-block" });
    }

    // After 5th post, inject upcoming events
    if (i === 4 && events.length > 0) {
      const upcoming = events.filter((e) => new Date(e.event_date) >= new Date()).slice(0, 2);
      if (upcoming.length > 0) {
        feedItems.push({ type: "events", data: upcoming, key: "events-block" });
      }
    }
  });

  // If few posts, still show blocks
  if (posts.length <= 1 && famTrips.length > 0) {
    feedItems.push({ type: "famtrips", data: famTrips.slice(0, 2), key: "famtrips-block" });
  }
  if (posts.length <= 4 && events.length > 0) {
    const upcoming = events.filter((e) => new Date(e.event_date) >= new Date()).slice(0, 2);
    if (upcoming.length > 0 && !feedItems.find((f) => f.key === "events-block")) {
      feedItems.push({ type: "events", data: upcoming, key: "events-block" });
    }
  }

  return (
    <div className="space-y-4">
      <CreatePostForm onSubmit={createPost} isCreating={isCreating} />

      {loadingPosts ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum post ainda</p>
          <p className="text-sm">Seja o primeiro a compartilhar algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => {
            if (item.type === "post") {
              return (
                <PostCard
                  key={item.key}
                  post={item.data}
                  onLike={(postId, liked) => toggleLike({ postId, liked })}
                  onDelete={deletePost}
                  onAddComment={addComment}
                  isAddingComment={isAddingComment}
                  fetchComments={fetchComments}
                  onDeleteComment={deleteComment}
                />
              );
            }

            if (item.type === "famtrips") {
              return (
                <Card key={item.key} className="border-primary/20 bg-primary/[0.02]">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Fam Trips Exclusivas</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">Travel Experts</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(item.data as FamTrip[]).map((trip) => (
                        <div key={trip.id} className="flex gap-3 items-start">
                          {trip.image_url && (
                            <img src={trip.image_url} alt={trip.destination} className="w-16 h-16 rounded-md object-cover shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{trip.destination}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(trip.trip_date), "dd MMM yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{trip.available_spots} vagas</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            if (item.type === "events") {
              return (
                <Card key={item.key} className="border-primary/20 bg-primary/[0.02]">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Próximos Encontros</span>
                    </div>
                    <div className="space-y-2.5">
                      {(item.data as InPersonEvent[]).map((event) => (
                        <div key={event.id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{event.theme}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_date), "dd MMM", { locale: ptBR })}
                              <span>·</span>
                              <span>{event.city}</span>
                            </div>
                          </div>
                          {event.registration_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 shrink-0"
                              onClick={() => window.open(event.registration_url!, "_blank")}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
