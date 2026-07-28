import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { MapMarkerData } from './types';

type GoogleMap = {
  setCenter(position: { lat: number; lng: number }): void;
  setZoom(value: number): void;
};

type GoogleMarker = {
  setMap(map: GoogleMap | null): void;
  addListener(event: string, callback: () => void): void;
};

type GoogleInfoWindow = {
  open(options: {
    map: GoogleMap;
    anchor: GoogleMarker;
  }): void;
};

type GoogleMapsApi = {
  Map: new (
    node: HTMLElement,
    options: Record<string, unknown>,
  ) => GoogleMap;

  Marker: new (
    options: Record<string, unknown>,
  ) => GoogleMarker;

  InfoWindow: new (
    options: { content: string },
  ) => GoogleInfoWindow;
};

declare global {
  interface Window {
    google?: {
      maps: GoogleMapsApi;
    };
  }
}

let loader: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (loader) {
    return loader;
  }

  const key = import.meta.env
    .VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  loader = new Promise((resolve, reject) => {
    if (!key) {
      reject(
        new Error(
          'VITE_GOOGLE_MAPS_API_KEY não configurada.',
        ),
      );
      return;
    }

    const script = document.createElement('script');

    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(key)}` +
      '&language=pt-BR&region=BR';

    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }

      reject(
        new Error('Google Maps não carregou.'),
      );
    };

    script.onerror = () => {
      reject(
        new Error(
          'Falha ao carregar Google Maps.',
        ),
      );
    };

    document.head.appendChild(script);
  });

  return loader;
}

const esc = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[char] ?? char,
  );

type MapViewProps = {
  markers: MapMarkerData[];
  height?: number;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
};

export function MapView({
  markers,
  height = 420,
  userLocation,
}: MapViewProps) {
  const elementRef =
    useRef<HTMLDivElement | null>(null);

  const markerRefs =
    useRef<GoogleMarker[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const maps = await loadGoogleMaps();

        if (
          cancelled ||
          !elementRef.current
        ) {
          return;
        }

        markerRefs.current.forEach(
          (marker) => marker.setMap(null),
        );

        markerRefs.current = [];

        const valid = markers.filter(
          (
            item,
          ): item is MapMarkerData & {
            latitude: number;
            longitude: number;
          } =>
            typeof item.latitude ===
              'number' &&
            typeof item.longitude ===
              'number' &&
            !(
              item.latitude === 0 &&
              item.longitude === 0
            ),
        );

        const center = userLocation
          ? {
              lat: userLocation.latitude,
              lng: userLocation.longitude,
            }
          : valid[0]
            ? {
                lat: valid[0].latitude,
                lng: valid[0].longitude,
              }
            : {
                lat: -15.793889,
                lng: -47.882778,
              };

        const map = new maps.Map(
          elementRef.current,
          {
            center,
            zoom: valid.length ? 8 : 4,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          },
        );

        const groups = new Map<
          string,
          typeof valid
        >();

        for (const item of valid) {
          const groupKey =
            valid.length > 40
              ? `${item.latitude.toFixed(
                  2,
                )}:${item.longitude.toFixed(
                  2,
                )}`
              : item.id;

          groups.set(groupKey, [
            ...(groups.get(groupKey) ??
              []),
            item,
          ]);
        }

        for (const group of groups.values()) {
          const item = group[0];

          const marker =
            new maps.Marker({
              map,
              position: {
                lat: item.latitude,
                lng: item.longitude,
              },
              title:
                group.length > 1
                  ? `${group.length} membros`
                  : item.title,
              label:
                group.length > 1
                  ? String(group.length)
                  : undefined,
            });

          const content =
            group.length > 1
              ? `<div><strong>${group.length} membros nesta região</strong><br>${group
                  .slice(0, 8)
                  .map((entry) =>
                    esc(entry.title),
                  )
                  .join('<br>')}</div>`
              : `<div style="max-width:260px"><strong>${esc(
                  item.title,
                )}</strong><br>${esc(
                  item.formattedAddress ||
                    item.address ||
                    '',
                )}<br>${
                  item.ministry
                    ? `Ministério: ${esc(
                        item.ministry,
                      )}<br>`
                    : ''
                }${
                  item.cell
                    ? `Célula: ${esc(
                        item.cell,
                      )}<br>`
                    : ''
                }${
                  item.phone
                    ? `Telefone: ${esc(
                        item.phone,
                      )}<br>`
                    : ''
                }${
                  item.googleMapsUrl ||
                  item.navigationUrl
                    ? `<a target="_blank" rel="noopener" href="${esc(
                        item.googleMapsUrl ||
                          item.navigationUrl ||
                          '',
                      )}">Abrir rota</a>`
                    : ''
                }</div>`;

          const info =
            new maps.InfoWindow({
              content,
            });

          marker.addListener(
            'click',
            () =>
              info.open({
                map,
                anchor: marker,
              }),
          );

          markerRefs.current.push(
            marker,
          );
        }

        if (userLocation) {
          const you =
            new maps.Marker({
              map,
              position: center,
              title: 'Você está aqui',
              label: '●',
            });

          markerRefs.current.push(you);

          map.setCenter(center);
          map.setZoom(12);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Não foi possível carregar o mapa.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [markers, userLocation]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={elementRef}
        sx={{
          height,
          borderRadius: 3,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      />

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(0,0,0,.35)',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
        >
          Não foi possível carregar o
          mapa. Exibindo lista
          simplificada. {error}
        </Alert>
      )}

      {!loading &&
        !error &&
        markers.every(
          (item) =>
            item.latitude === null ||
            item.longitude === null,
        ) && (
          <Typography
            color="text.secondary"
            mt={1}
          >
            Nenhuma coordenada válida
            disponível.
          </Typography>
        )}
    </Box>
  );
}