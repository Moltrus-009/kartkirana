import React from 'react';
import {
  ChevronRight,
  Clock3,
  Compass,
  IndianRupee,
  MapPin,
  Navigation,
  Package,
  Power,
  Star,
  Store,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SVGMap } from '../components/SVGMap';
import { isOrderStatus } from '../types/orderStatus';

interface HomeProps {
  setActiveTab: (tab: 'home' | 'orders' | 'earnings' | 'profile') => void;
  setViewActiveMap: (view: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({ setActiveTab, setViewActiveMap }) => {
  const {
    user,
    isOnline,
    setOnlineStatus,
    activeOrders,
    activeBatch,
    todayEarnings,
    todayDeliveries,
    acceptanceRate,
    currentRating
  } = useApp();

  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'Partner';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning!' : hour < 17 ? 'Good afternoon!' : 'Good evening!';
  const todayDistance = (todayDeliveries * 3.4).toFixed(1);

  const activeStop = (() => {
    if (activeBatch?.stops?.length) {
      const index = Math.min(Math.max(activeBatch.currentStopIndex || 0, 0), activeBatch.stops.length - 1);
      const stop = activeBatch.stops[index];
      const isPickup = stop.type === 'pickup';
      return {
        orderId: stop.orderId,
        label: isPickup ? 'Pick up order' : 'Deliver order',
        name: isPickup ? stop.shopName || 'Partner Store' : stop.customerName || 'Customer',
        address: isPickup ? stop.shopAddress || 'Store location' : stop.address || 'Delivery location',
        progress: `Stop ${index + 1} of ${activeBatch.stops.length}`,
        isPickup
      };
    }

    const order = activeOrders[0];
    if (!order) return null;
    const isPickup = isOrderStatus(order.status, 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP');
    return {
      orderId: order.id,
      label: isPickup ? 'Pick up order' : 'Deliver order',
      name: isPickup ? order.shopName || 'Partner Store' : order.contact?.name || 'Customer',
      address: isPickup ? order.shopAddress || 'Store location' : order.deliveryAddress?.address || 'Delivery location',
      progress: isPickup ? 'Pickup stop' : 'Customer stop',
      isPickup
    };
  })();

  return (
    <div className="rider-screen animate-fade-in">
      <section className="rider-hero">
        <div>
          <p className="rider-eyebrow">Delivery partner</p>
          <h1>Hello, {firstName} <span aria-hidden="true">👋</span></h1>
          <p>{greeting}</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlineStatus(!isOnline)}
          className={`rider-online-toggle ${isOnline ? 'is-online' : ''}`}
          aria-pressed={isOnline}
        >
          <span>{isOnline ? 'Online' : 'Offline'}</span>
          <span className="rider-toggle-track"><span /></span>
        </button>
      </section>

      <section className="rider-summary-card" aria-label="Today's summary">
        <p className="rider-section-kicker">Today's summary</p>
        <div className="rider-summary-grid">
          <div>
            <strong>{todayDeliveries}</strong>
            <span>Deliveries</span>
          </div>
          <div>
            <strong>₹{todayEarnings}</strong>
            <span>Earnings</span>
          </div>
          <div>
            <strong>{todayDistance}<small> km</small></strong>
            <span>Distance</span>
          </div>
        </div>
      </section>

      {activeStop ? (
        <section className="rider-card rider-task-card">
          <div className="rider-card-heading">
            <div>
              <p className="rider-section-kicker">Current task</p>
              <h2>{activeStop.label}</h2>
            </div>
            <span className="rider-status-badge">{activeStop.progress}</span>
          </div>

          <div className="rider-task-row">
            <span className={`rider-task-icon ${activeStop.isPickup ? 'pickup' : 'drop'}`}>
              {activeStop.isPickup ? <Store size={19} /> : <MapPin size={19} />}
            </span>
            <div className="rider-task-copy">
              <strong>#{String(activeStop.orderId).slice(0, 12).toUpperCase()}</strong>
              <span>{activeStop.name}</span>
              <small>{activeStop.address}</small>
            </div>
          </div>

          <button type="button" onClick={() => setViewActiveMap(true)} className="rider-primary-button">
            <Navigation size={16} />
            Navigate
          </button>
        </section>
      ) : (
        <section className={`rider-card rider-idle-card ${isOnline ? 'is-searching' : ''}`}>
          <span className="rider-idle-icon">{isOnline ? <Compass size={25} /> : <Power size={25} />}</span>
          <div>
            <h2>{isOnline ? 'Finding nearby orders' : 'You are currently offline'}</h2>
            <p>{isOnline ? 'Stay ready. A new delivery request will appear automatically.' : 'Go online when you are ready to receive delivery assignments.'}</p>
          </div>
          {!isOnline && (
            <button type="button" onClick={() => setOnlineStatus(true)} className="rider-primary-button">
              Go online
            </button>
          )}
        </section>
      )}

      {activeOrders.length > 1 && (
        <section className="rider-card">
          <div className="rider-card-heading">
            <h2>Upcoming</h2>
            <button type="button" onClick={() => setActiveTab('orders')} className="rider-text-button">
              {activeOrders.length - 1} orders <ChevronRight size={14} />
            </button>
          </div>
          <div className="rider-compact-list">
            {activeOrders.slice(1, 4).map(order => (
              <button key={order.id} type="button" onClick={() => setActiveTab('orders')}>
                <MapPin size={17} />
                <span>
                  <strong>Order #{String(order.id).slice(0, 8).toUpperCase()}</strong>
                  <small>{order.shopName}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rider-card">
        <div className="rider-card-heading">
          <div>
            <p className="rider-section-kicker">Daily target</p>
            <h2>Complete 5 deliveries</h2>
          </div>
          <span className="rider-bonus">₹120 bonus</span>
        </div>
        <div className="rider-progress"><span style={{ width: `${Math.min(100, (todayDeliveries / 5) * 100)}%` }} /></div>
        <div className="rider-progress-copy">
          <span>{todayDeliveries} of 5 completed</span>
          <strong>{todayDeliveries >= 5 ? 'Target achieved' : `${5 - todayDeliveries} remaining`}</strong>
        </div>
      </section>

      <section className="rider-quick-grid">
        <button type="button" onClick={() => setActiveTab('earnings')} className="rider-card">
          <span className="rider-quick-icon green"><IndianRupee size={18} /></span>
          <small>Earnings</small>
          <strong>₹{todayEarnings}</strong>
          <span>View breakdown <ChevronRight size={13} /></span>
        </button>
        <button type="button" onClick={() => setActiveTab('orders')} className="rider-card">
          <span className="rider-quick-icon blue"><Package size={18} /></span>
          <small>Orders</small>
          <strong>{todayDeliveries}</strong>
          <span>View history <ChevronRight size={13} /></span>
        </button>
        <div className="rider-card rider-metric-card">
          <span className="rider-quick-icon yellow"><Star size={18} /></span>
          <small>Rating</small>
          <strong>{Number(currentRating || 0).toFixed(1)}</strong>
          <span>Partner score</span>
        </div>
        <div className="rider-card rider-metric-card">
          <span className="rider-quick-icon blue"><TrendingUp size={18} /></span>
          <small>Acceptance</small>
          <strong>{acceptanceRate}%</strong>
          <span>Today</span>
        </div>
      </section>

      {isOnline && user?.coords && (
        <section className="rider-card rider-map-preview">
          <div className="rider-card-heading">
            <div>
              <p className="rider-section-kicker">Live location</p>
              <h2>GPS tracking active</h2>
            </div>
            <span className="rider-live-dot">Live</span>
          </div>
          <div className="rider-map-frame">
            <SVGMap riderCoords={user.coords} stops={[]} currentStopIndex={0} status="" />
          </div>
          <p className="rider-location-caption"><Clock3 size={13} /> Location updates automatically while you are online.</p>
        </section>
      )}
    </div>
  );
};
