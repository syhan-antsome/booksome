import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { getSessionTokens } from '@/lib/auth';
import type { ReadingBook } from '@/lib/reading';
import { serveStudyCover, type CoverAccess } from '@/lib/study/cover-proxy';

export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  const {id}=await context.params;
  async function readBook(bookId:string):Promise<CoverAccess> {
    const {accessToken}=await getSessionTokens();if(!accessToken)return {status:401};
    const response=await apiFetch(`/api/reading-life/books/${encodeURIComponent(bookId)}`,{
      headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
    });
    if(response.status===401)return {status:401};
    if(!response.ok)return {status:response.status===404?404:502};
    const {book}=await response.json() as {book:ReadingBook|null};
    return book?{status:200,coverUrl:book.externalCoverUrl}:{status:404};
  }
  return serveStudyCover(request,id,readBook,getApiBaseUrl(),process.env.NEXT_PUBLIC_API_BASE_URL||'https://api.booksome.top');
}
