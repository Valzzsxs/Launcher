import sys

def fix_keyboard():
    with open('src/mykeyboard.cpp', 'r') as f:
        content = f.read()

    search_str = """#elif defined(HAS_BTN)
            if (check(SelPress)) {
                selection_made = true;
            } else {
                if (check(NextPress)) {
                    if ((x >= buttons_number - 1 && y <= -1) || (x >= KeyboardWidth - 1 && y >= 0)) {
                        y++;
                        x = 0;
                    } else x++;

                    if (y >= KeyboardHeight) y = -1;
                    if (y == -1 && x >= buttons_number) x = 0;

                    redraw = true;
                }
                if (check(PrevPress)) {
                    if (x <= 0) {
                        y--;
                        if (y == -1) x = buttons_number - 1;
                        else x = KeyboardWidth - 1;
                    } else x--;

                    if (y < -1) {
                        y = KeyboardHeight - 1;
                        x = KeyboardWidth - 1;
                    }

                    redraw = true;
                }
                if (check(EscPress)) {
                    y++;
                    if (y >= KeyboardHeight) y = -1;
                    if (y == -1 && x >= buttons_number) x = buttons_number - 1;
                    redraw = true;
                }
            }
#endif"""

    replace_str = """#elif defined(HAS_BTN)
            if (check(SelPress)) {
                selection_made = true;
            } else {
                // Tombol bawah (NextPress): pindah x (kanan)
                if (check(NextPress)) {
                    x++;
                    // Wrap around in the current row
                    if (y == -1 && x >= buttons_number) x = 0;
                    else if (y >= 0 && x >= KeyboardWidth) x = 0;

                    redraw = true;
                }
                // Tombol atas (PrevPress): pindah y (bawah)
                if (check(PrevPress)) {
                    y++;
                    // Wrap around to top row
                    if (y >= KeyboardHeight) y = -1;

                    // Constrain x if top row has fewer buttons
                    if (y == -1 && x >= buttons_number) x = buttons_number - 1;

                    redraw = true;
                }
                // Tombol atas double click/hold (EscPress): pindah y (atas) -> mundur row
                if (check(EscPress)) {
                    y--;
                    if (y < -1) y = KeyboardHeight - 1;

                    if (y == -1 && x >= buttons_number) x = buttons_number - 1;

                    redraw = true;
                }
            }
#endif"""

    new_content = content.replace(search_str, replace_str)

    if new_content == content:
        print("Replacement failed. String not found.")
    else:
        with open('src/mykeyboard.cpp', 'w') as f:
            f.write(new_content)
        print("Updated correctly.")

if __name__ == "__main__":
    fix_keyboard()
