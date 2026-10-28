// import { users } from '../data/fixtures/fixture-data';

const DEFAULT_PORT = 3000;
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';
// const DEFAULT_DEMO_USER_ID =
//   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEFAULT_SIMULATED_IO_MS = 0;

function validatePort(value: string | undefined): number {
  const port = Number(value ?? DEFAULT_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

function validateFrontendOrigin(
  value: string | undefined,
): string {
  const origin = value ?? DEFAULT_FRONTEND_ORIGIN;

  try {
    const url = new URL(origin);

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      throw new Error();
    }

    if (url.pathname !== '/' || url.search || url.hash) {
      throw new Error();
    }

    return origin;
  } catch {
    throw new Error(
      'FRONTEND_ORIGIN must be a valid HTTP or HTTPS origin',
    );
  }
}


function validateSimulatedIoMs(
  value: string | undefined,
): number {
  const simulatedIoMs = Number(
    value ?? DEFAULT_SIMULATED_IO_MS,
  );

  if (
    !Number.isInteger(simulatedIoMs) ||
    simulatedIoMs < 0 ||
    simulatedIoMs > 1000
  ) {
    throw new Error(
      'SIMULATED_IO_MS must be an integer from 0 to 1000',
    );
  }

  return simulatedIoMs;
}

export default () => ({
  port: validatePort(process.env.PORT),

  frontendOrigin: validateFrontendOrigin(
    process.env.FRONTEND_ORIGIN,
  ),

  simulatedIoMs: validateSimulatedIoMs(
    process.env.SIMULATED_IO_MS,
  ),
});