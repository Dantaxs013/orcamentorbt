import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Tipos permitidos: PDFs e Imagens (PNG, JPG, JPEG, WEBP)
const MIME_TYPES_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const EXTENSOES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15MB por arquivo

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const categoria = (formData.get('categoria') as string) || 'documentos';

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    if (file.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json(
        { error: 'Arquivo excede o limite máximo permitido de 15MB.' },
        { status: 400 }
      );
    }

    const extensao = path.extname(file.name).toLowerCase();
    if (!EXTENSOES_PERMITIDAS.includes(extensao) && !MIME_TYPES_PERMITIDOS.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato não suportado. Por favor, envie documentos PDF ou imagens (PNG, JPG, WEBP).' },
        { status: 400 }
      );
    }

    // Pasta física de salvamento: public/uploads/<categoria>
    const pastaDestino = path.join(process.cwd(), 'public', 'uploads', categoria);
    if (!existsSync(pastaDestino)) {
      await mkdir(pastaDestino, { recursive: true });
    }

    // Gerar nome de arquivo seguro e único
    const timestamp = Date.now();
    const nomeLimpo = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(extensao, '');
    const nomeFinal = `${timestamp}_${nomeLimpo.slice(0, 40)}${extensao}`;
    const caminhoCompleto = path.join(pastaDestino, nomeFinal);

    // Salvar arquivo no disco
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(caminhoCompleto, buffer);

    // URL pública acessível pelo navegador
    const fileUrl = `/uploads/${categoria}/${nomeFinal}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Erro no upload de arquivo:', error);
    return NextResponse.json(
      { error: 'Falha ao salvar o arquivo enviado. Tente novamente.' },
      { status: 500 }
    );
  }
}
