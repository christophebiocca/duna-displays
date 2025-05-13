import 'reset-css';
import './App.css';
import { Playlist, Content, ImageContent, VideoContent, IFrameContent } from "./content";
import { assertNever } from "./util";
import { useState, useEffect } from "react";

export function App() {
  useEffect(function() {
    // Register a timeout to refresh the entire page.
    const timeIncrement = 4 * 60 * 60 * 1000;
    const nextIncrement = (Math.floor(Date.now() / timeIncrement) + 1) * timeIncrement;

    const timeoutId = setTimeout(function() {
      window.location.reload();
    }, nextIncrement - Date.now());
    return () => clearTimeout(timeoutId);
  }, []);
  return <Carrousel />;
}

interface Displaying {
  readonly type: "displaying";
  readonly playlist: Playlist,
  readonly currentContent: Content,
}

interface LoadingNext {
  readonly type: "loadingNext";
  readonly playlist: Playlist,
  readonly currentContent: Content,
  readonly nextContent: Content,
}

type CarrouselState = Displaying | LoadingNext

function Carrousel() {
  const [state, setState] = useState<CarrouselState>(function(){
    const initialPlaylist = Playlist.initialPlaylist();
    const [playlist, currentContent] = initialPlaylist.advance();
    return {
      type: "displaying",
      playlist,
      currentContent,
    };
  });

  useEffect(function() {
    if (state.type == "displaying") {
      // Register a timeout to begin loading the next one.
      const timeoutId = setTimeout(function() {
        const [playlist, nextContent] = state.playlist.advance();
        setState({
          type: "loadingNext",
          playlist,
          currentContent: state.currentContent,
          nextContent,
        });
      }, state.currentContent.duration * 1000);
      return () => clearTimeout(timeoutId);
    } else {
      return;
    }
  }, [state]);

  if (state.type == "displaying") {
    return <ContentPresenter key={state.currentContent.url} mode="active" content={state.currentContent} />;
  } else if (state.type == "loadingNext") {
    const currentState: LoadingNext = state;
    function presentNewContent() {
      setState({
        type: "displaying",
        playlist: currentState.playlist,
        currentContent: currentState.nextContent,
      })
    }
    return <>
      <ContentPresenter key={state.currentContent.url} mode="active" content={state.currentContent} />
      <ContentPresenter key={state.nextContent.url} mode="preloading" content={state.nextContent} onLoad={presentNewContent} />
    </>;
  } else {
    return assertNever(state);
  }
}

function ContentPresenter(props: {content: Content, mode: "active" | "preloading", onLoad?: () => void}) {
  if (props.content.type == "image") {
    return <ImagePresenter mode={props.mode} content={props.content} onLoad={props.onLoad} />;
  } else if (props.content.type == "video") {
    return <VideoPresenter mode={props.mode} content={props.content} onLoad={props.onLoad} />;
  } else if (props.content.type == "iframe") {
    return <IFramePresenter mode={props.mode} content={props.content} onLoad={props.onLoad} />;
  } else {
    return assertNever(props.content);
  }
}

function ImagePresenter(props: {content: ImageContent, mode: "active" | "preloading", onLoad?: () => void}) {
  return <img className={`image-presenter-${props.mode}`} src={props.content.url} onLoad={props.onLoad} />;
}

function VideoPresenter(props: {content: VideoContent, mode: "active" | "preloading", onLoad?: () => void}) {
  return <video className={`video-presenter-${props.mode}`} src={props.content.url} autoPlay={true} muted onCanPlay={props.onLoad} preload="auto" />;
}

function IFramePresenter(props: {content: IFrameContent, mode: "active" | "preloading", onLoad?: () => void}) {
  return <iframe
    className={`iframe-presenter-${props.mode}`}
    src={props.content.url}
    sandbox="allow-scripts allow-same-origin"
    referrerPolicy="no-referrer"
    credentialless="true"
    onLoad={props.onLoad}
  />;
}
