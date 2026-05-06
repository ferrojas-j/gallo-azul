const SUPABASE_URL = 'https://quzjixxqowxbezbcmqws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1emppeHhxb3d4YmV6YmNtcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYwMTcsImV4cCI6MjA5MzQ5MjAxN30.cp_eoG5fAbead2rOdVbsHjNo5hLFMRvkFS9OvL5rcyk';

export interface Reservation {
  id: number;
  guestName: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  guestCity?: string;
  guestZipCode?: string;
  guestCountry?: string;
  adults?: number;
  children?: number;
  totalAmount?: number;
  currency?: string;
  paymentStatus?: string;
  isPaid?: boolean | number;
  sourceName?: string;
  listingMapId: number;
  roomName: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  status: string;
}

export async function getUpcomingCheckins(): Promise<Reservation[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hostaway-proxy`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Hostaway Proxy Error:', error);
    throw new Error(error.message || 'No se pudo conectar con el servicio de reservas');
  }
}

export async function updateReservationStatus(reservationId: number, status?: string, noShow?: boolean, cancelledBy: string = 'host', isPaid?: boolean): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hostaway-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateReservationStatus',
        params: { reservationId, status, noShow, cancelledBy, isPaid }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Hostaway Update Error:', error);
    throw new Error(error.message || 'No se pudo actualizar la reserva');
  }
}

export async function createReservation(params: any): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hostaway-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createReservation',
        params
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Hostaway Create Error:', error);
    throw new Error(error.message || 'No se pudo crear la reserva en Hostaway');
  }
}
