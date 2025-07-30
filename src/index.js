import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Firebase configuration مباشرة في الكود
const firebaseConfig = {
  apiKey: "AIzaSyC07Gs8L5vxlUmC561PKbxthewA1mrxYDk",
  authDomain: "zylos-test.firebaseapp.com",
  databaseURL: "https://zylos-test-default-rtdb.firebaseio.com",
  projectId: "zylos-test",
  storageBucket: "zylos-test.firebasestorage.app",
  messagingSenderId: "553027007913",
  appId: "1:553027007913:web:2daa37ddf2b2c7c20b00b8"
};

// Enable CORS
app.use('*', cors())

// Root endpoint
app.get('/', (c) => {
  return c.json({ message: 'مرحباً بك في سيرفر المصادقة' })
})

// Signup endpoint
app.post('/api/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    
    if (!email || !password || !name) {
      return c.json({ error: 'جميع الحقول مطلوبة' }, 400)
    }

    // Firebase Auth REST API for signup
    const signupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    )

    const signupData = await signupResponse.json()

    if (!signupResponse.ok) {
      return c.json({ error: signupData.error.message }, 400)
    }

    // Store user data in Realtime Database
    const userDataResponse = await fetch(
      `${firebaseConfig.databaseURL}/users/${signupData.localId}.json?auth=${signupData.idToken}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          createdAt: new Date().toISOString()
        })
      }
    )

    if (!userDataResponse.ok) {
      return c.json({ error: 'فشل في حفظ بيانات المستخدم' }, 500)
    }

    return c.json({
      success: true,
      user: {
        uid: signupData.localId,
        email: signupData.email,
        name
      },
      token: signupData.idToken
    })

  } catch (error) {
    return c.json({ error: 'خطأ في السيرفر' }, 500)
  }
})

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, 400)
    }

    // Firebase Auth REST API for login
    const loginResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    )

    const loginData = await loginResponse.json()

    if (!loginResponse.ok) {
      return c.json({ error: loginData.error.message }, 400)
    }

    // Get user data from Realtime Database
    const userDataResponse = await fetch(
      `${firebaseConfig.databaseURL}/users/${loginData.localId}.json?auth=${loginData.idToken}`
    )

    const userData = await userDataResponse.json()

    return c.json({
      success: true,
      user: {
        uid: loginData.localId,
        email: loginData.email,
        name: userData?.name || 'مستخدم'
      },
      token: loginData.idToken
    })

  } catch (error) {
    return c.json({ error: 'خطأ في السيرفر' }, 500)
  }
})

// Get user profile
app.get('/api/profile', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return c.json({ error: 'غير مصرح' }, 401)
    }

    // Verify token with Firebase
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      }
    )

    const verifyData = await verifyResponse.json()

    if (!verifyResponse.ok) {
      return c.json({ error: 'رمز غير صالح' }, 401)
    }

    const userId = verifyData.users[0].localId

    // Get user data
    const userDataResponse = await fetch(
      `${firebaseConfig.databaseURL}/users/${userId}.json?auth=${token}`
    )

    const userData = await userDataResponse.json()

    return c.json({
      success: true,
      user: {
        uid: userId,
        email: verifyData.users[0].email,
        ...userData
      }
    })

  } catch (error) {
    return c.json({ error: 'خطأ في السيرفر' }, 500)
  }
})

export default app