import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'redux'
import Tone from 'tone'

import instrumentSelector from '../../selectors/instrument'
import scoreSelector from '../../selectors/score'
import soundsSelector from '../../selectors/sounds'

class ScoreInstrumentItem extends Component {
  handlePlayerInstrument () {
    const {
      scoreInstrument,
      instrument,
      sounds
    } = this.props
    this.instrument = Tone.Pattern.instrument(
      scoreInstrument.id,
      { sounds, ...instrument }
    )
  }

  componentDidMount () {
    this.handlePlayerInstrument()
  }

  componentDidUpdate (prevProps) {
    const {
      instrument,
      sounds
    } = this.props
    if (
      prevProps.instrument !== instrument ||
      prevProps.sounds !== sounds
    ) {
      this.handlePlayerInstrument()
    }
  }

  render () {
    const {
      instrument
    } = this.props
    const {
      name
    } = (instrument || {})
    return (
      <div>
        {name}
      </div>
    )
  }
}

export default compose(
  withRouter,
  connect(
    (state, ownProps) => {
      const { match, scoreInstrument } = ownProps
      const { scoreId } = match.params
      const instrument = instrumentSelector(state, scoreId, scoreInstrument.instrumentId)
      const sounds = soundsSelector(state, scoreInstrument.instrumentId)
      return {
        instrument,
        score: scoreSelector(state, scoreId),
        sounds
      }
    }
  )
)(ScoreInstrumentItem)
