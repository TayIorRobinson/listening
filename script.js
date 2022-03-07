document.body.innerHTML = "<progress></progress>";
import htm from 'https://cdn.skypack.dev/pin/htm@v3.1.0-GfbFayS9fb6XpfZ6otqZ/mode=imports,min/optimized/htm.js';
import { Component, h, render } from 'https://cdn.skypack.dev/pin/preact@v10.6.6-ge7qJUoCQlQnJtIbgkte/mode=imports,min/optimized/preact.js';
import { APP_NAME, LFM_API_KEY, LFM_USER,CORS_PROXY,STRINGS } from './consts.js';

const dateFormatter = new Intl.RelativeTimeFormat(undefined);

function formatDate(date) {
    var current = new Date()
    var diff = Math.round((current - date) / 1000);
    if (diff < 60) return dateFormatter.format(-diff, 'second');
    diff = Math.round(diff / 60);
    if (diff < 60) return dateFormatter.format(-diff, 'minute');
    diff = Math.round(diff / 60);;
    if (diff < 24) return dateFormatter.format(-diff, 'hour');
    diff = Math.round(diff / 24);;
    if (diff < 7) return dateFormatter.format(-diff, 'day');
    diff = Math.round(diff / 7);;
    return dateFormatter.format(-diff, 'week');
}


var youtubeLinkCache = {};

// Initialize htm with Preact
const html = htm.bind(h);

function TrackCard({title, artist, album, image, time, link}) {
    return html`
    <a target="track" href="${link}" class="card ${time ? "" : "listening" }">
        ${time ? "" : html`<div class="bg-image"  style="${time ? "" : `background-image: url(${image})`}"></div>`}
        <div class="card-content">
            <div class="media">
                <div class="media-left">
                    <figure class="image is-48x48">
                        <img src="${time ? image.replace("/u/","/u/174s/") : image}" alt="${album}" />
                    </figure>
                </div>
                <div class="media-content">
                    <p class="title is-4">${title}</p>
                    <p class="subtitle is-6">${artist} - ${album}</p>
                </div>
                <div class="media-right">
                    ${time 
                        ? html`<time datetime="${time.toString()}">(${formatDate(time)})</time>`  
                        : typeof youtubeLinkCache[link] === "string" 
                            ? html`<iframe src="${youtubeLinkCache[link]}"></iframe>`
                            : ""
                    }
                </div>
            </div>

        </div>
    </a>
    `;
}

async function getYouTubeLink(url) {
    var response = await fetch(`${CORS_PROXY}${url}`);
    var data = await response.text();
    try {
        var match = data.split("data-youtube-id=\"")[1].split("\"")[0];
        youtubeLinkCache[url] = `https://www.youtube-nocookie.com/embed/${match}?autoplay=1`;
    } catch(e) {
        console.log(e);
        youtubeLinkCache[url] = false;
    }
    return youtubeLinkCache[url];
}

class App extends Component {
    constructor() {
        super();
        this.state = { tracks: [{
            name: "Waiting",
            artist: {
                "#text": "The Please Waits",
            } ,
            album: {
                "#text": "Waiting - Single",
            },
            image: [{"#text": ""}],
            url: "#",

        }] };
    }

    componentDidMount() {
        this.update()
        this.timer = setInterval(() => {
            this.update();
        }, 30000);
    }

    componentWillUnmount() {
        // stop when not renderable
        clearInterval(this.timer);
    }

    async update() {
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LFM_USER}&api_key=${LFM_API_KEY}&format=json`);
        const data = await response.json();
        const tracks = data.recenttracks.track;
        console.log(tracks);
        this.setState({ tracks });
        await Promise.all(
            tracks
                .filter((a) => !!a["@attr"])
                .map((p) => getYouTubeLink(p.url))
        );
        this.setState({});
    }

    render() {
        return html`
        <div class="container is-widescreen">
            ${this.state.tracks.map((track,i) => TrackCard({
                title: track.name,
                artist: track.artist['#text'],
                album: track.album['#text'],
                image: track.image[0]['#text'].replace(/\/u\/[\w\d]+\//, '/u/'),
                time: track.date ? new Date(track.date.uts * 1000) : null,
                link: track.url,
            }))}
            <center><a href="https://www.last.fm/user/${LFM_USER}">${STRINGS.footer}</a></center>
            </div>
        
        `;
    }
}

document.body.innerHTML = "";
render(html`<${App}/>`, document.body);

document.title = APP_NAME