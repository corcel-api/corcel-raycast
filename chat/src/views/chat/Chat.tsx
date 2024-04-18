import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

import {
  Chat,
  Exchange,
  addOrUpdateExchange,
  deleteExchangeFromChatStorage,
  generateChatFromQuestion,
  generateExchangeFromQuestion,
  putNewChatInStorage,
} from "../../lib/chat";
import { utcTimeAgo } from "../../lib/time";
import { useSendLastMessage } from "../../hooks";
import { TOMATO } from "../../lib/colors";

const ListItem: React.FC<{
  exchanges: Exchange[];
  exchange: Exchange;
  handleSendMessage: () => void;
  setIsLoading: (isLoading: boolean) => void;
  chat: Chat;
}> = ({ exchange, handleSendMessage, setIsLoading, exchanges, chat }) => {
  const [internalExchange, setInternalExchange] = useState(exchange);
  const internalExchangeRef = useRef(internalExchange);

  const { streamMessage, systemResponse, errorMessage, isStreaming, cancelStream } = useSendLastMessage(
    exchanges,
    chat.model,
  );

  const updateChatExchange = useCallback(() => {
    addOrUpdateExchange(internalExchangeRef.current, chat.id);
  }, []);

  useEffect(() => {
    internalExchangeRef.current = internalExchange;
    if (!internalExchange.answer) {
      setIsLoading(true);
      streamMessage()
        .then(() => {
          setIsLoading(false);
          updateChatExchange(); // Save to store
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [internalExchange]);

  useEffect(() => {
    if (systemResponse) {
      setInternalExchange((internalExchange) => ({
        ...internalExchange,
        answer: { content: systemResponse, updated_on: new Date().toUTCString() },
      }));
    }
  }, [systemResponse]);

  return (
    <List.Item
      id={internalExchange.id}
      title={internalExchange.question.content}
      accessories={[{ text: utcTimeAgo(internalExchange.created_on) }]}
      detail={
        <List.Item.Detail
          markdown={errorMessage ? `> ## Error: ${errorMessage}` : internalExchange.answer?.content || ""}
        />
      }
      key={internalExchange.id}
      subtitle={errorMessage ? `Error: ${errorMessage}` : ""}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <Action
              title="Send a Message"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              icon={Icon.Message}
              onAction={() => {
                handleSendMessage();
              }}
            />
            {isStreaming && (
              <Action
                title="Cancel"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                icon={{ source: Icon.Xmark, tintColor: TOMATO }}
                onAction={() => {
                  cancelStream();
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Question" content={internalExchange.question.content} />
            {internalExchange.answer && (
              <Action.CopyToClipboard title="Copy Answer" content={internalExchange.answer.content} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Delete">
            <Action
              title="Delete Message"
              icon={Icon.Trash}
              onAction={() => {
                deleteExchangeFromChatStorage(internalExchange.id, chat.id);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const Chat: React.FC<{ chat?: Chat }> = ({ chat }) => {
  const [internalChat, setInternalChat] = useState(chat);
  const [chatText, setChatText] = useState("");
  const [internalIsLoading, setInternalIsLoading] = useState(false);

  const addNewExchange = useCallback(() => {
    if (!internalIsLoading) {
      if (internalChat) {
        const exchange = generateExchangeFromQuestion(chatText);
        setInternalChat({ ...internalChat, exchanges: [exchange, ...internalChat.exchanges] });
      } else {
        const newChat = generateChatFromQuestion(chatText);
        putNewChatInStorage(newChat);
        setInternalChat(newChat);
      }

      setChatText("");
    }
  }, [internalChat, chatText, setInternalChat]);

  const onSearchTextChange = useCallback(
    (value: string) => {
      if (!internalIsLoading) {
        setChatText(value);
      }
    },
    [internalIsLoading, setChatText],
  );

  return (
    <List
      searchBarPlaceholder="Send a message..."
      searchText={chatText}
      filtering={false}
      isLoading={internalIsLoading}
      isShowingDetail={!!internalChat}
      onSearchTextChange={onSearchTextChange}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <Action
              title="Send a Message"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              icon={Icon.Message}
              onAction={addNewExchange}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!internalChat || internalChat.exchanges.length === 0 ? (
        <List.EmptyView icon={{ source: "icon-chat-bubble.svg" }} title="Type something to start chatting." />
      ) : (
        <List.Section>
          {internalChat.exchanges.map((exchange) => (
            <ListItem
              chat={internalChat}
              key={exchange.id}
              exchanges={internalChat.exchanges}
              exchange={exchange}
              handleSendMessage={addNewExchange}
              setIsLoading={setInternalIsLoading}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default Chat;
