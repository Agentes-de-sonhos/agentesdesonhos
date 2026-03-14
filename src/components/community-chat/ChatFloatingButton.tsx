import { useState, useCallback } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useCommunityChat, CommunityRoom } from "@/hooks/useCommunityChat";
import { usePresence, OnlineAgent } from "@/hooks/usePresence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  X,
  ArrowLeft,
  Users,
  Hash,
} from "lucide-react";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";

type ChatView = "menu" | "room" | "dm" | "conversations";

export function ChatFloatingButton() {
  const { plan } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ChatView>("menu");
  const [activeRoomId, setActiveRoomId] = useState<string>();
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [activeRoomName, setActiveRoomName] = useState("");

  const { rooms, messages: roomMessages, sendMessage: sendRoomMessage, isSending: isSendingRoom } =
    useCommunityChat(activeRoomId);
  const {
    conversations,
    messages: dmMessages,
    sendMessage: sendDM,
    isSending: isSendingDM,
    startConversation,
    totalUnread,
  } = useDirectMessages(activeConversationId);
  const { onlineCount } = usePresence();

  const handleAgentChat = useCallback(
    async (agent: OnlineAgent) => {
      const convId = await startConversation(agent.user_id);
      if (convId) {
        setActiveConversationId(convId);
        setView("dm");
        setIsOpen(true);
      }
    },
    [startConversation]
  );

  if (plan !== "premium") return null;

  const openRoom = (room: CommunityRoom) => {
    setActiveRoomId(room.id);
    setActiveRoomName(`${room.emoji} ${room.name}`);
    setView("room");
  };

  const openDM = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setView("dm");
  };

  const goBack = () => {
    if (view === "room") {
      setActiveRoomId(undefined);
      setView("menu");
    } else if (view === "dm") {
      setActiveConversationId(undefined);
      setView("conversations");
    } else if (view === "conversations") {
      setView("menu");
    } else {
      setView("menu");
    }
  };

  const generalRoom = rooms.find((r) => r.is_general);
  const thematicRooms = rooms.filter((r) => !r.is_general);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            {view !== "menu" && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h3 className="font-semibold text-sm flex-1 truncate">
              {view === "menu" && "Comunidade"}
              {view === "room" && activeRoomName}
              {view === "conversations" && "Mensagens Diretas"}
              {view === "dm" &&
                conversations.find((c) => c.id === activeConversationId)?.other_user
                  .name}
            </h3>
            {view === "menu" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <span className="h-2 w-2 rounded-full bg-success inline-block" />
                {onlineCount + 1} online
              </Badge>
            )}
          </div>

          {/* Content */}
          {view === "menu" && (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {/* General Room */}
                {generalRoom && (
                  <button
                    onClick={() => openRoom(generalRoom)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
                  >
                    <span className="text-2xl">{generalRoom.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{generalRoom.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {generalRoom.description}
                      </p>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )}

                {/* Thematic Rooms */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Salas Temáticas
                  </h4>
                  <div className="space-y-1">
                    {thematicRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => openRoom(room)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <span className="text-lg">{room.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{room.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {room.description}
                          </p>
                        </div>
                        <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* DMs */}
                <div>
                  <button
                    onClick={() => setView("conversations")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left"
                  >
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Mensagens Diretas</p>
                      <p className="text-xs text-muted-foreground">
                        Converse com outros agentes
                      </p>
                    </div>
                    {totalUnread > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {totalUnread}
                      </Badge>
                    )}
                  </button>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Room Chat View */}
          {view === "room" && activeRoomId && (
            <>
              <ChatMessageList messages={roomMessages} />
              <ChatInput
                onSend={(content) =>
                  sendRoomMessage({ roomId: activeRoomId, content })
                }
                disabled={isSendingRoom}
                placeholder="Envie uma mensagem para a sala..."
              />
            </>
          )}

          {/* Conversations List */}
          {view === "conversations" && (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Nenhuma conversa ainda.</p>
                    <p className="text-xs mt-1">
                      Clique no avatar de um agente online para iniciar uma conversa.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openDM(conv.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={conv.other_user.avatar_url || undefined}
                          />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {conv.other_user.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.other_user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.last_message_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {/* DM Chat View */}
          {view === "dm" && activeConversationId && (
            <>
              <ChatMessageList messages={dmMessages} showReadStatus />
              <ChatInput
                onSend={(content) =>
                  sendDM({ conversationId: activeConversationId, content })
                }
                disabled={isSendingDM}
                placeholder="Envie uma mensagem..."
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
