import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";

import {
  type Chat,
  Exchange,
  addOrUpdateExchange,
  deleteExchangeFromChatStorage,
  generateChatFromQuestion,
  generateExchangeFromQuestion,
  addOrUpdateChatInStorage,
  Model,
  CHAT_MODEL_TO_NAME_MAP,
} from "../../lib/chat";
import { utcTimeAgo } from "../../lib/time";
import { useSendLastMessage } from "../../hooks";
import { TOMATO } from "../../lib/colors";

const models: { name: string; value: Model }[] = [
  { name: CHAT_MODEL_TO_NAME_MAP["cortext-ultra"], value: "cortext-ultra" },
  { name: CHAT_MODEL_TO_NAME_MAP["mixtral-8x7b"], value: "mixtral-8x7b" },
];

const ListItem: React.FC<{
  exchanges: Exchange[];
  exchange: Exchange;
  handleSendMessage: () => void;
  setIsLoading: (isLoading: boolean) => void;
  chat: Chat;
  model: Model;
}> = ({ exchange, handleSendMessage, setIsLoading, exchanges, chat, model }) => {
  const [internalExchange, setInternalExchange] = useState(exchange);
  const internalExchangeRef = useRef(internalExchange);

  const { streamMessage, systemResponse, errorMessage, isStreaming, cancelStream } = useSendLastMessage(exchanges);

  const updateChatExchange = useCallback(() => {
    addOrUpdateExchange(internalExchangeRef.current, chat.id);
  }, []);

  useEffect(() => {
    internalExchangeRef.current = internalExchange;
    if (!internalExchange.answer) {
      setIsLoading(true);
      streamMessage(model)
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
          markdown={
            errorMessage
              ? `> ## Error: ${errorMessage}`
              : `**${CHAT_MODEL_TO_NAME_MAP[internalExchange.model]}**: ${internalExchange.answer?.content || "..."}`
          }
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

const Chat: React.FC<{ chat?: Chat; onChatUpdated?: (updatedChat: Chat) => void }> = ({ chat, onChatUpdated }) => {
  const preferences = getPreferenceValues<Preferences>();
  const [internalChat, setInternalChat] = useState(chat);
  const [chatText, setChatText] = useState("");
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [model, setModel] = useState<Model>(preferences.chatModel);

  const addNewExchange = useCallback(() => {
    if (!internalIsLoading) {
      if (internalChat) {
        const exchange = generateExchangeFromQuestion(chatText, model);
        setInternalChat({ ...internalChat, exchanges: [exchange, ...internalChat.exchanges] });
      } else {
        const newChat = generateChatFromQuestion(chatText, model);
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

  useEffect(() => {
    if (internalChat) {
      addOrUpdateChatInStorage(internalChat).then(() => {
        if (onChatUpdated) {
          onChatUpdated({ ...internalChat });
        }
      });
    }
  }, [internalChat]);

  return (
    <List
      searchBarPlaceholder="Send a message..."
      searchText={chatText}
      filtering={false}
      isLoading={internalIsLoading}
      isShowingDetail={!!internalChat}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select an Engine"
          onChange={(newValue) => {
            setModel(newValue as Model);
          }}
        >
          <List.Dropdown.Section title="Models">
            {models.map((model) => (
              <List.Dropdown.Item key={model.value} title={model.name} value={model.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
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
              model={model}
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
