// A piece of content we show on screen.
export interface BaseContent {
  // How long the content should stay on each time.
  readonly duration: number;
  // How much does this content show up compared to everything else.
  readonly weight: number;
}

// Another webpage we host inside an IFrame. Most flexible,
// but requires cooperation from the other side.
export interface IFrameContent extends BaseContent {
  readonly type: "iframe";
  readonly url: string;
}

// An img tag presenting some content.
export interface ImageContent extends BaseContent {
  readonly type: "image";
  readonly url: string;
}

// A video that will autoplay.
export interface VideoContent extends BaseContent {
  readonly type: "video";
  readonly url: string;
}

export type Content = IFrameContent | ImageContent | VideoContent;

const all_content: ReadonlyArray<Content> = [
  {
    type: "image",
    url: "https://images.squarespace-cdn.com/content/v1/6769817bb9d06354515ff127/3b666be6-7379-4e60-bc5a-46344bdefb5d/303fab61-eabf-47cb-b47a-99f3529e2944.png",
    duration: 20,
    weight: 1,
  },
  {
    type: "video",
    url: "https://img.bioc.ca/duna_displays/residence.mp4",
    duration: 42,
    weight: 1,
  },
  {
    type: "video",
    url: "https://img.bioc.ca/duna_displays/land.mp4",
    duration: 146,
    weight: 0.5,
  },
  {
    type: "iframe",
    url: "https://infinitacity.sola.day/event/infinitacity/schedule/list",
    duration: 30,
    weight: 1,
  },
  {
    type: "image",
    url: "https://img.bioc.ca/duna_displays/momsperfectday.jpeg",
    duration: 20,
    weight: 1,
  },
  {
    type: "image",
    url: "https://img.bioc.ca/duna_displays/rnrmothersday.jpeg",
    duration: 20,
    weight: 1,
  },
  {
    type: "image",
    url: "https://img.bioc.ca/duna_displays/bonfire.jpeg",
    duration: 20,
    weight: 1,
  },
  {
    type: "iframe",
    url: "https://www.wunderground.com/forecast/hn/roat%C3%A1n",
    duration: 30,
    weight: 1.2,
  },
];

class ScheduleEntry {
  constructor(
    public readonly content: Content,
    private readonly interval: number,
    private readonly lastPlayed: Date,
  ) {
  }

  public timeAdjustedWeight(currentTime: Date): number {
    // Adjust by proportion on interval that has passed.
    const last_interval = (currentTime.getTime() - this.lastPlayed.getTime()) / 1000;
    const adjustment = last_interval / this.interval;
    // Less than 20% of the normal interval time => Zero chance of showing up again.
    if (adjustment < 0.2) {
      return 0;
    } else {
      return adjustment * this.content.weight;
    }
  }

  public withLastPlayed(lastPlayed: Date): ScheduleEntry {
    return new ScheduleEntry(this.content, this.interval, lastPlayed);
  }

  public static unplayedWithTotalWeight(content: Content, total_weight: number, currentTime: Date): ScheduleEntry {
    const interval = (total_weight * content.duration / content.weight) - content.duration;
    return new ScheduleEntry(
      content,
      interval,
      // Basically every video is equally due to be played at this time.
      new Date(currentTime.getTime() - interval * 1000),
    );
  }
}

export class Playlist {
  constructor(private readonly schedule: ReadonlyArray<ScheduleEntry>, private readonly currentlyPlaying: number | null) {
  }

  public advance(): [Playlist, Content] {
    const currentTime = new Date();
    const entries = this.schedule.slice();
    if (this.currentlyPlaying != null) {
      entries[this.currentlyPlaying] = entries[this.currentlyPlaying].withLastPlayed(currentTime);
    }
    const weights = entries.map(function(entry) {
      return entry.timeAdjustedWeight(currentTime);
    });
    const sum_weights = weights.reduce(function(acc, e) {
      return acc + e;
    }, 0);
    let running_sum = 0;
    const cumulative_probabilities = weights.map(function(weight) {
      running_sum += weight / sum_weights;
      return running_sum;
    });
    if (running_sum < 0.99 || running_sum > 1.01) {
      throw new Error("Christophe can't do math, apparently.");
    }
    const rand = Math.random();
    const indexToPlay = cumulative_probabilities.findIndex(function(cumulative_prob) {
      return cumulative_prob > rand;
    });
    return [new Playlist(entries, indexToPlay), entries[indexToPlay].content];
  }

  public static initialPlaylist(): Playlist {
    const currentTime = new Date();
    const sum_weights = all_content.reduce(function(acc, content) {
      return acc + content.weight;
    }, 0);
    const entries = all_content.map(function(content) {
      return ScheduleEntry.unplayedWithTotalWeight(content, sum_weights, currentTime);
    });

    return new Playlist(entries, null);
  }
}
