/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { isFunction, isOneOf } from '../common';
import { NativeError } from '../internal/NativeError';
import { AdEventType } from '../AdEventType';
import { RewardedAdEventType } from '../RewardedAdEventType';
import { SharedEventEmitter } from '../internal/SharedEventEmitter';
import { GAMAdEventType } from '../GAMAdEventType';
import { validateAdShowOptions } from '../validateAdShowOptions';
export class MobileAd {
  constructor(type, requestId, adUnitId, adLoadFunction, adShowFunction, requestOptions) {
    this._type = type;
    this._requestId = requestId;
    this._adUnitId = adUnitId;
    this._adLoadFunction = adLoadFunction;
    this._adShowFunction = adShowFunction;
    this._requestOptions = requestOptions;
    this._loaded = false;
    this._isLoadCalled = false;
    this._adEventsListeners = new Map();
    this._adEventListenersMap = new Map();
    Object.values({
      ...AdEventType,
      ...RewardedAdEventType,
      ...GAMAdEventType,
      _: AdEventType.LOADED // since AdEventType.LOADED is overwritten by RewardedAdEventType.LOADED
    }).forEach(type => {
      this._adEventListenersMap.set(type, new Map());
    });
    this._adEventListenerId = 0;
    this._adEventsListenerId = 0;
    this._nativeListener = SharedEventEmitter.addListener(`google_mobile_ads_${type}_event:${adUnitId}:${requestId}`, this._handleAdEvent.bind(this));
  }
  _handleAdEvent(event) {
    const {
      type,
      error,
      data
    } = event.body;
    if (type === AdEventType.LOADED || type === RewardedAdEventType.LOADED) {
      this._loaded = true;
    }
    if (type === AdEventType.CLOSED) {
      this._loaded = false;
      this._isLoadCalled = false;
    }
    if (type === AdEventType.ERROR) {
      this._loaded = false;
      this._isLoadCalled = false;
    }
    let payload = data;
    if (error) {
      payload = NativeError.fromEvent(error, 'googleMobileAds');
    }
    this._adEventsListeners.forEach(listener => {
      listener({
        type,
        payload
      });
    });
    this._getAdEventListeners(type).forEach(listener => {
      listener(payload);
    });
  }
  _addAdEventsListener(listener) {
    if (!isFunction(listener)) {
      throw new Error(`${this._className}.addAdEventsListener(*) 'listener' expected a function.`);
    }
    const id = this._adEventsListenerId++;
    this._adEventsListeners.set(id, listener);
    return () => {
      this._adEventsListeners.delete(id);
    };
  }
  _addAdEventListener(type, listener) {
    if (!(isOneOf(type, Object.values(AdEventType)) || isOneOf(type, Object.values(GAMAdEventType)) || isOneOf(type, Object.values(RewardedAdEventType)) && (this._type === 'rewarded' || this._type === 'rewarded_interstitial'))) {
      throw new Error(`${this._className}.addAdEventListener(*) 'type' expected a valid event type value.`);
    }
    if (!isFunction(listener)) {
      throw new Error(`${this._className}.addAdEventListener(_, *) 'listener' expected a function.`);
    }
    const id = this._adEventListenerId++;
    this._getAdEventListeners(type).set(id, listener);
    return () => {
      this._getAdEventListeners(type).delete(id);
    };
  }
  _getAdEventListeners(type) {
    return this._adEventListenersMap.get(type);
  }
  get _className() {
    return this.constructor.name;
  }
  load() {
    // Prevent multiple load calls
    if (this._loaded || this._isLoadCalled) {
      return;
    }
    this._isLoadCalled = true;
    this._adLoadFunction(this._requestId, this._adUnitId, this._requestOptions);
  }
  show(showOptions) {
    if (!this._loaded) {
      throw new Error(`${this._className}.show() The requested ${this._className} has not loaded and could not be shown.`);
    }
    let options;
    try {
      options = validateAdShowOptions(showOptions);
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`${this._className}.show(*) ${e.message}.`);
      } else {
        throw e;
      }
    }
    return this._adShowFunction(this._requestId, this._adUnitId, options);
  }
  removeAllListeners() {
    this._adEventsListeners.clear();
    this._adEventListenersMap.forEach((_, type, map) => {
      map.set(type, new Map());
    });
  }
  get adUnitId() {
    return this._adUnitId;
  }
  get loaded() {
    return this._loaded;
  }
}
//# sourceMappingURL=MobileAd.js.map