import { currentUser } from '@clerk/nextjs/server';
import { handleCollectionsRequest } from '../../../../lib/collections-handler.js';

export async function GET(request) {
  try {
    const user = await currentUser();

    return await handleCollectionsRequest({
      user,
      requestUrl: request.url,
    });
  } catch (error) {
    console.error('Collections API error:', error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
