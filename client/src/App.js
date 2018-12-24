import React, { Component } from 'react';
import './App.css';

import SpotifyWebApi from 'spotify-web-api-js';
const spotifyApi = new SpotifyWebApi();

const clientid = 'xxx'
const scope = 'user-modify-playback-state user-read-private user-read-playback-state'
const redirect_uri = 'http://localhost:3000/callback'

class App extends Component {
  constructor(){
    super();
    this.myInput = React.createRef()
    const params = this.getHashParams();
    const token = params.access_token;
    if (token) {
      spotifyApi.setAccessToken(token);
    }
    this.state = {
      token: token ? token : null,
      loggedIn: token ? true : false,
      nowPlaying: { name: 'Not Checked', artists: [], albumArt: '' },
      profile: { id: '', href: ''},
      blackList: [],
      newItem: '',
      skipCount: 0
    }
  }
  getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    e = r.exec(q)
    while (e) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
       e = r.exec(q);
    }
    return hashParams;
  }

  generateRandomString = (length) => {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  searchTest = (queryTerm) => {
    spotifyApi.searchArtists(queryTerm, {limit: 5})
    .then((response) => {
      // console.log(response)
    })
  }

  getNowPlaying = () => {
    spotifyApi.getMyCurrentPlaybackState()
      .then((response) => {
        this.setState({
          nowPlaying: { 
              name: response.item.name, 
              artists: response.item.artists,
              albumArt: response.item.album.images[0].url
            }
        })
      }).then(() => {
        this.checkBlacklisted() 
      }).catch((err) => {
        console.log('error', err)
      })
  }

  getPrivate = () => {
    const url = "https://api.spotify.com/v1/me";

    fetch(url, {
      headers:{
        'Authorization': `Bearer ${this.state.token}`
      }
    })
  .then((response) => response.json()) // Transform the data into json
  .then((data) => {
    this.setState({
      profile: { 
          id: data.id, 
          href: data.external_urls.spotify
        }
    })
    let blackList = JSON.parse(localStorage.getItem(`blacklist-${this.state.profile.id}`))
    this.setState({
      blackList
    })
    let skipCount = JSON.parse(localStorage.getItem(`skipCount-${this.state.profile.id}`))
    this.setState({
      skipCount
    })

    })
    .catch(err => {
      console.log('error', err)
    })
  }

  getArtists = (artists) => {
    if(artists.length) {
      if(artists[0].name.includes('Bieber')) {
        this.nextTrack()
      }
      if(artists.length === 0) {
        return artists[0].name
      } else {
        let list = ''
        artists.map((artist, i) => i === 0 ? list = artist.name : list += `, ${artist.name}` )
        return list
      }
    }
  }

  setNewItem = (event) => {
    this.setState({
      newItem: event.target.value
    })
  }

  addNewItem = (input) => {
    let blackList = []
    if(this.state.blackList ) {
     blackList = [ ...this.state.blackList ]
    }
    if(input === 'input') {
      if(this.state.newItem.length > 0) {
        blackList.push(this.state.newItem)
        this.setState({
          blackList
        })
        localStorage.setItem(`blacklist-${this.state.profile.id}`, JSON.stringify(blackList))
        this.myInput.current.value = ''
      }
    } else {
      blackList.push(input)
      this.setState({
        blackList
      })
      localStorage.setItem(`blacklist-${this.state.profile.id}`, JSON.stringify(blackList))
    }
  }

  handleKeyPress = (event) => {
    if(event.key === 'Enter'){
      this.addNewItem('input')
      this.setState({ newItem: '' })
    }
  }

  removeItem = (item) => {
    if(this.state.blackList) {
      let blackList = [ ...this.state.blackList ]
      for (let i = blackList.length-1; i>=0; i--) {
        if (blackList[i] === item) {
            blackList.splice(i, 1);
            break
        }
      }
      this.setState({
        blackList
      })
      localStorage.setItem(`blacklist-${this.state.profile.id}`, JSON.stringify(blackList))
    }
  }

  nextTrack = () => {
    var http = new XMLHttpRequest();
    var url = 'https://api.spotify.com/v1/me/player/next';
    http.open('POST', url, true);

    http.setRequestHeader('Content-type', 'application/json');
    http.setRequestHeader('Accept', 'application/json');
    http.setRequestHeader('Authorization', `Bearer ${this.state.token}`);

    http.onreadystatechange = function() {
        if(http.readyState === 4 && http.status === 200) {
            console.log(http.responseText);
        }
    }
    http.send(null);
  }

  checkBlacklisted = () => {
    if(this.state.blackList.length > 0) {
      this.state.blackList.forEach((item) => {
        if(this.state.nowPlaying.name.toString().toLowerCase().includes(item.toLowerCase())) {
          this.nextTrack()
          this.addSkipCount()
        }
        this.state.nowPlaying.artists.forEach((artist)=> {
          if (artist.name.toLowerCase() === item.toLowerCase() ) {
            this.nextTrack()
            this.addSkipCount()
          }
        })
      })
    }
  }

  addSkipCount = () => {
    let skipCount = this.state.skipCount
    skipCount++
    this.setState({ skipCount })
    localStorage.setItem(`skipCount-${this.state.profile.id}`, JSON.stringify(skipCount))
  }

  componentDidMount () {
    if(this.state.loggedIn) {
      this.getPrivate()
      this.timer = setInterval(()=> {
        this.getNowPlaying()
      }, 1000)
    }
  }

  componentWillUnmount() {
    this.timer = null
  }
  

  render() {
    const url = `https://accounts.spotify.com/authorize?response_type=token&client_id=${encodeURIComponent(clientid)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${this.generateRandomString(16)}`
    return (
      <div className="App">
        { !this.state.loggedIn ? (
          <a href={url}> Login to Spotify </a> 
        ) : (
        <div>
          <div>
            <h1>🎵 Now Playing: </h1>
            {this.searchTest('boef')}
            <p>{this.state.nowPlaying.name} <button onClick={()=> this.addNewItem(this.state.nowPlaying.name)}>Add to blacklist 💀</button></p> 
            <p><b>{this.getArtists(this.state.nowPlaying.artists)}</b></p>
          </div>
          <p>
            <img src={this.state.nowPlaying.albumArt} style={{ height: 250 }} alt="" />
          </p>
          <button onClick={()=> this.nextTrack()}>Next song</button>
          {this.state.skipCount > 1 && (
            <p>Blacklist skipped a song <b>{this.state.skipCount}</b> times</p>
          )}
          <h2>Profile</h2>
          <p><a href={this.state.profile.href} target="_blank">{this.state.profile.id}</a></p>
          <h2>💀 Blacklist</h2>
          <ul>
            {(this.state.blackList || []).map((item, i)=>
            <li key={`blacklist-${i}`}>{item} <button onClick={()=> this.removeItem(item)}>remove</button></li> )}
          </ul>
          <input type="text" name="newItem" placeholder="Song or artist" onKeyPress={this.handleKeyPress} onInput={(event)=> this.setNewItem(event)} ref={this.myInput} />
          <button onClick={()=> this.addNewItem('input')}>Add to blacklist 💀</button>
        </div>
        ) }
      </div>

    );
  }
}

export default App;
