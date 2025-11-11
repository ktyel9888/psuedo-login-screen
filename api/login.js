// /api/login.js
import { sql } from '@vercel/postgres'; // Vercel DB 연결 패키지

// (임시) 허용된 사용자 목록
const ALLOWED_USERS = {
  "admin@company.com": "adminpass",
  "user1@company.com": "password123",
};

// Vercel이 이 함수를 API 엔드포인트로 만듭니다.
export default async function handler(request, response) {
  
  // POST 요청이 아니면 거부 (로그인 폼은 POST 방식)
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  let isValidUser = false;
  let email = '';
  const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'IP Not Found';

  try {
    const { email: reqEmail, password } = request.body;
    email = reqEmail; // try 밖에서 쓰기 위해 저장

    // 1. 인증 로직: 미리 정해둔 목록과 비교
    if (ALLOWED_USERS[email] && ALLOWED_USERS[email] === password) {
      isValidUser = true;
    }

    // 2. IP 주소 및 로그인 시도 결과 DB에 로깅
    await sql`
      INSERT INTO login_logs (email, ip_address, success)
      VALUES (${email || 'unknown'}, ${ip}, ${isValidUser});
    `;

    if (!isValidUser) {
      // 로그인 실패
      return response.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    // 3. 로그인 성공
    return response.status(200).json({ message: '로그인 성공', ipLogged: ip });

  } catch (error) {
    console.error(error);
    // 에러 발생 시에도 로그 기록 시도
    await sql`
      INSERT INTO login_logs (email, ip_address, success)
      VALUES (${email || 'error'}, ${ip}, false);
    `;
    return response.status(500).json({ message: '서버 오류', error: error.message });
  }
}