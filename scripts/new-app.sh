#!/usr/bin/env bash
# 템플릿 식별자(스택 이름, 번들 ID, 표시 이름)를 새 앱 값으로 한 번에 바꿉니다.
# 사용법: scripts/new-app.sh <slug> <bundle-id> "<Display Name>"
set -euo pipefail

OLD_STACK=backend-template
OLD_ID=com.reppley.template
OLD_NAME=mobile
OLD_TITLE="Mobile App"

die() { echo "error: $*" >&2; exit 1; }

[ $# -eq 3 ] || die '사용법: scripts/new-app.sh <slug> <bundle-id> "<Display Name>"'
SLUG=$1 BUNDLE_ID=$2 NAME=$3

[[ $SLUG =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ && ${#SLUG} -le 40 ]] ||
  die "slug는 소문자-kebab(영문 소문자로 시작, 40자 이하)이어야 합니다: $SLUG"
[[ $BUNDLE_ID =~ ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$ ]] ||
  die "bundle-id는 reverse-DNS(소문자·숫자·밑줄, 점 2개 이상 구간)여야 합니다: $BUNDLE_ID"
for seg in ${BUNDLE_ID//./ }; do
  case " abstract assert boolean break byte case catch char class const continue default do double else enum \
extends final finally float for goto if implements import instanceof int interface long native new package \
private protected public return short static strictfp super switch synchronized this throw throws transient \
try void volatile while true false null " in
    *" $seg "*) die "bundle-id 구간 '$seg'은 Java 예약어입니다" ;;
  esac
done
[[ -n $NAME && ! $NAME =~ [\"\'\\\<\>\&\$[:cntrl:]] ]] ||
  die "표시 이름은 비어 있거나 \" ' \\ < > & \$ 를 포함할 수 없습니다"

cd "$(dirname "$0")/.."

# 하나라도 이미 바뀌었으면 아무것도 건드리지 않고 중단한다.
has() { grep -qF -- "$2" "$1" || die "$1 에 '$2' 가 없습니다. 이미 새 앱으로 바꿨거나 수정된 템플릿입니다."; }
has backend/samconfig.toml "stack_name = \"$OLD_STACK\""
has backend/samconfig.toml "s3_prefix = \"$OLD_STACK\""
has mobile/capacitor.config.ts "appId: \"$OLD_ID\""
has mobile/capacitor.config.ts "appName: \"$OLD_NAME\""
has mobile/index.html "<title>$OLD_TITLE</title>"
has mobile/ios/App/App.xcodeproj/project.pbxproj "PRODUCT_BUNDLE_IDENTIFIER = $OLD_ID;"
has mobile/ios/App/App/Info.plist "<string>$OLD_NAME</string>"
has mobile/android/app/build.gradle "namespace = \"$OLD_ID\""
has mobile/android/app/src/main/res/values/strings.xml "<string name=\"app_name\">$OLD_NAME</string>"
OLD_JAVA=mobile/android/app/src/main/java/${OLD_ID//./\/}/MainActivity.java
[ -f "$OLD_JAVA" ] || die "$OLD_JAVA 가 없습니다."

# perl은 치환 문자열을 ENV에서 그대로 읽으므로 sed와 달리 BSD/GNU 차이와 특수문자 문제가 없다.
export SLUG BUNDLE_ID NAME OLD_STACK OLD_ID OLD_NAME OLD_TITLE
sub() { local f=$1; shift; perl -0pi -e "$@" "$f"; }

sub backend/samconfig.toml 's/\Q$ENV{OLD_STACK}\E/$ENV{SLUG}/g'
for f in mobile/capacitor.config.ts mobile/ios/App/App.xcodeproj/project.pbxproj \
  mobile/android/app/build.gradle mobile/android/app/src/main/res/values/strings.xml \
  "$OLD_JAVA" docs/frontend-stack.md; do
  sub "$f" 's/\Q$ENV{OLD_ID}\E/$ENV{BUNDLE_ID}/g'
done
sub mobile/capacitor.config.ts 's/appName: "\Q$ENV{OLD_NAME}\E"/appName: "$ENV{NAME}"/'
sub mobile/index.html 's/<title>\Q$ENV{OLD_TITLE}\E<\/title>/<title>$ENV{NAME}<\/title>/'
sub mobile/ios/App/App/Info.plist 's/(CFBundleDisplayName<\/key>\s*<string>)\Q$ENV{OLD_NAME}\E</$1$ENV{NAME}</'
sub mobile/android/app/src/main/res/values/strings.xml 's/(name="(?:app_name|title_activity_main)">)\Q$ENV{OLD_NAME}\E</$1$ENV{NAME}</g'

NEW_JAVA_DIR=mobile/android/app/src/main/java/${BUNDLE_ID//./\/}
tmp=$(mktemp)
mv "$OLD_JAVA" "$tmp"
rmdir -p "$(dirname "$OLD_JAVA")" 2>/dev/null || true
mkdir -p "$NEW_JAVA_DIR"
mv "$tmp" "$NEW_JAVA_DIR/MainActivity.java"

cat <<MSG

완료: $SLUG / $BUNDLE_ID / $NAME

남은 수동 작업 (Google OAuth 클라이언트 ID는 건드리지 않았습니다)
  1. Google Cloud에서 OAuth 클라이언트 생성: 웹, iOS($BUNDLE_ID), Android($BUNDLE_ID + SHA-1)
  2. 웹 클라이언트 ID를 backend/samconfig.toml 의 GoogleWebClientId 와 mobile/.env.local 에 넣기
     iOS 클라이언트 ID를 mobile/.env.local 과 mobile/ios/App/App/Info.plist 의 URL scheme 에 넣기
  3. JWT 시크릿 만들기:
     aws ssm put-parameter --name /$SLUG/JWT_SECRET --type SecureString --value "\$(openssl rand -hex 32)" --region ap-northeast-2
  4. 배포(테스트 + DB 마이그레이션 + 드리프트 검사 + 배포): ./run.sh
  5. mobile/.env.local 의 VITE_API_URL 을 FunctionUrl 로 설정
MSG
