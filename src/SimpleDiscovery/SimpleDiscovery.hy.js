/* jshint undef: true */
import Discovery from 'service-framework/dist/Discovery';
import config from '../../config.json';
import {divideURL} from '../utils/utils';
import IdentityManager from '../IdentityManager';


class SimpleDiscovery { // extends EventEmitter because we need to recieve events

  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');

    this._domain = divideURL(hypertyURL).domain;
    this.discovery = new Discovery(hypertyURL, bus);
    this.identityManager = new IdentityManager(hypertyURL, configuration.runtimeURL, bus);
    this.myUrl = hypertyURL; // own hypertyUrl
  }

}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'SimpleDiscovery',
    instance: new SimpleDiscovery(hypertyURL, bus, configuration)
  };
}
