import Tone from 'tone'

import { context } from './audio'

/*
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
function pitchIndexToTone (index) {
  const levelIndex = Math.floor(index / 12)
  const noteIndex = index % 12
  return `${notes[noteIndex]}${levelIndex}`
}
*/

window.Tone = Tone

export default class Instrument {
  constructor (instrument = {}) {
    Object.assign(this, instrument)
    this.isSetup = false
    this.audio = {}
    this.partition = {}
  }

  async setup () {
    await Promise.all((this.sounds || []).map(async sound => {
      const { pitch, sample } = sound

      let decodedAudioData
      if (sample) {
        const response = await fetch(sample.url)
        const decode = () => new Promise(resolve => {
          response.arrayBuffer().then(arrayBuffer => {
            context.decodeAudioData(arrayBuffer, resolve)
          })
        })
        decodedAudioData = await decode()
      } else {
        console.log(`You need to define a proper audio data for this sound ${this.name}`)
      }

      console.log('pitch', pitch)
      this.audio[pitch] = decodedAudioData
    }))

    this.isSetup = true
    this.handleSetupSuccess && this.handleSetupSuccess()
    Tone.Player.handleInstrumentSetupSuccess()
  }

  trigger (time, event, part) {
    console.log(this.name, 'time', time, 'event', event, part.name)
    const {
      pitch,
      source
    } = event

    if (source) {
      source.start()
    } else {
      console.log(`source not found for pitch ${this.name} ${pitch}`)
    }
  }

  part (key, part) {

    if (!this.isSetup) {
      console.log(`instrument ${this.name} is not setup to do a part`)
      return
    }

    if (this.partition[key]) {
      return this.partition[key]
    }

    const {
      description,
      indexes
    } = part
    let {
      rootPitch,
      rootTime
    } = part

    if (indexes[0] === 0) {
      if (indexes[1] === 0) {
        rootPitch = 12 * 4
        rootTime = 0
      } else {
        const previousPart = this.partition[`0/${indexes[1] - 1}`]
        if (previousPart) {
          const previousEvent = previousPart._events.slice(-1)[0]
          rootPitch = previousEvent.value.pitch
          rootTime = previousEvent.time
        } else {
          console.log(`previousPart not found for ${this.name} 0/${indexes[1] - 1}`)
        }
      }
    } else {
      const previousPatternIndex = Math.max(
        ...Object.values(this.partition)
          .filter(part => part.indexes[0] === indexes[0] - 1)
          .map(part => part.indexes[1])
      )
      const previousPart = this.partition[`${indexes[0] - 1}/${previousPatternIndex}`]
      if (previousPart) {
        const previousEvent = previousPart._events.slice(-1)[0]
        rootPitch = previousEvent.value.pitch
        rootTime = previousEvent.time
      } else {
        console.log(`previousPart not found for ${this.name} ${indexes[0] - 1}/${previousPatternIndex}`)
      }
    }

    const events = part.events.map(event => ({ ...event }))

    events.forEach((event, index) => {
      const {
        duration,
        interval,
        pitch,
        source,
        time
      } = event
      if (!pitch) {
        event.pitch = index === 0
          ? rootPitch
          : events[index - 1].pitch + interval
      }
      if (!time) {
        event.time = index === 0
          ? 0
          : events[index - 1].time + 1/duration
      }
      if (!source) {
        const source = context.createBufferSource()
        const decodedAudioData = this.audio[event.pitch]
        if (decodedAudioData) {
          source.buffer = decodedAudioData
          source.connect(context.destination)
          event.source = source
        } else {
          console.log(`decodedAudioData not found for event in ${this.name} ${description}`)
        }
      }
    })

    const tonePart = new Tone.Part(
      (time, event) => this.trigger(time, event, part),
      events
    )
    Object.assign(tonePart, part)

    tonePart._events.forEach((_event, index) =>
      Object.assign(_event, events[index]))

    tonePart.start(rootTime)

    this.partition[key] = tonePart
  }

  cancel () {
    delete this.partition
    this.partition = {}
  }
}
